import json
EX = {
 'banker': "The banker left the bank and",
 'river': "The banker left the bank and sat on the left bank of the river.",
 'trophyLarge': "The trophy wouldn't fit in the suitcase because it was too large.",
 'trophySmall': "The trophy wouldn't fit in the suitcase because it was too small.",
 'annie': "When Annie brought her picnic basket to Jim's house because they were going on a picnic, she made sure to pack a",
}
REF = {
 'money': ["He opened a savings account at the bank", "The robbers stole money from the bank", "She went to get cash from the bank", "They took out a loan from the bank", "He deposited the check at the bank", "The teller at the bank counted the bills"],
 'river': ["They watched the boats along the river bank", "The canoe drifted toward the muddy bank", "We had a picnic on the grassy bank", "Fish swam near the bank of the stream", "The frog jumped from the bank into the pond", "Reeds grew along the bank of the lake"],
 'went': ["She left the room quickly", "He left the party early", "They left home at dawn", "The train left the station", "We left our keys inside", "My friend left town yesterday"],
 'side': ["Turn left at the light", "It is on the left side", "Raise your left hand", "The store is to the left", "Look to your left", "The left lane is closed"],
}
PAIRS = [
 ['She deposited her paycheck at the bank', 'The ducks rested on the grassy bank'],
]
allS = list(EX.values()) + sum(REF.values(), []) + sum(PAIRS, [])
json.dump(allS, open('s2.json', 'w'))
