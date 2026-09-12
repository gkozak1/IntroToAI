# Number Recognition Neural Network Visualization

`index.html` preserves the original solo activity and adds an optional, code-free synchronous team mode.

## Firebase setup

The app uses the existing `fielddossier` Firebase project and stores team data only under:

`numberRecognition/main`

Before using team mode:

1. Confirm **Anonymous** sign-in is enabled in Firebase Authentication.
2. Merge the `numberRecognition` child from `firebase.rules.patch.json` into the top-level `rules` object of the project's current Realtime Database rules. Do not replace the project's other rule branches.
3. Publish the updated database rules and host `index.html` normally.

Solo mode does not initialize Firebase. Team mode uses one shared classroom lobby with no session code.

## Recovery behavior

- Participant, administrator, and neuron claims become stale after **60 seconds** without a heartbeat.
- An empty room resets after 30 minutes.
- A stale activity resets after **1 hour** when the next participant joins.

The rules grant authenticated classroom participants access to this one activity branch. Within the classroom app, ownership, layer gates, validation, and administrator actions are coordinated with atomic Firebase transactions.
