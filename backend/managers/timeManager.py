import asyncio

class TimeManager:
    def __init__(self, game, room, coding_time, voting_time):
        self.game = game
        self.room = room

        self.BRIEFING_DURATION = 30
        self.CODING_DURATION = coding_time
        self.TURN_DURATION = 30
        self.VOTING_DURATION = voting_time

        self.briefing_timer_task = None
        self.coding_timer_task = None
        self.voting_timer_task = None

        self.num_rounds = self.CODING_DURATION // self.TURN_DURATION

    async def stop_briefing_timer(self):
        if self.briefing_timer_task and not self.briefing_timer_task.done():
            self.briefing_timer_task.cancel()
            try:
                await self.briefing_timer_task
            except asyncio.CancelledError:
                pass
        self.briefing_timer_task = None

    async def start_briefing_timer(self):
        briefing_time_left = self.BRIEFING_DURATION
        try:
            while briefing_time_left > 0:
                await self.room.broadcast({
                    "type": "briefing-time-left",
                    "briefingTimeLeft": briefing_time_left
                })
                await asyncio.sleep(1)
                briefing_time_left -= 1

            await self.room.broadcast({
                "type": "briefing-over"
            })

            await self.game.set_coding()
            
        except asyncio.CancelledError:
            pass

    async def stop_coding_timer(self):
        if self.coding_timer_task and not self.coding_timer_task.done():
            self.coding_timer_task.cancel()
            try:
                await self.coding_timer_task
            except asyncio.CancelledError:
                pass
        self.coding_timer_task = None

    async def start_coding_timer(self):
        coding_time_left = self.CODING_DURATION
        try:
            while coding_time_left > 0:
                turn_time_left = self.TURN_DURATION
                while turn_time_left > 0:
                    await self.room.broadcast({
                        "type": "coding-time-left",
                        "codingTimeLeft": coding_time_left,
                        "turnTimeLeft": turn_time_left
                    })
                    await asyncio.sleep(1)
                    coding_time_left -= 1
                    turn_time_left -= 1
                self.num_rounds -= 1
                await self.game.turn_over()

        except asyncio.CancelledError:
            pass

    async def stop_voting_timer(self):
        if self.voting_timer_task and not self.voting_timer_task.done():
            self.voting_timer_task.cancel()
            try:
                await self.voting_timer_task
            except asyncio.CancelledError:
                pass
        self.voting_timer_task = None

    async def start_voting_timer(self):
        voting_time_left = self.VOTING_DURATION
        try:
            while voting_time_left > 0:
                await self.room.broadcast({
                    "type": "voting-time-left",
                    "votingTimeLeft": voting_time_left
                })
                await asyncio.sleep(1)
                voting_time_left -= 1

            response = {
                "type": "voting-over",
                "voted": self.game.get_voted(),
                "votedCorrectly": self.game.get_imposter_id() in self.game.get_voted()
            }
            await self.room.broadcast(response)
            
            await self.game.set_results()

        except asyncio.CancelledError:
            pass

    async def stop_all_timers(self):
        await self.stop_briefing_timer()
        await self.stop_coding_timer()
        await self.stop_voting_timer()