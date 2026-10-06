-- Vampire heist: every kill heals the killer; three kills without dying are announced.
-- Runs only while the "Vampire heist" mode is played, inside the game's sandbox.

local streak = {}

function onRoundStart()
  streak = {}
  game.message("Vampire heist: every kill heals you by 35 HP.")
end

function onKill(victim, killer)
  streak[victim] = 0
  if killer == nil or killer < 0 or killer == victim then return end
  game.heal(killer, 35)
  streak[killer] = (streak[killer] or 0) + 1
  if streak[killer] == 3 then
    game.message("Player " .. killer .. " is on a three-kill streak!")
  end
end
