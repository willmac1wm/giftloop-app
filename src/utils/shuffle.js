/**
 * Secret Santa draw. Other gift types get their own algorithm.
 * Exclusions are directional, nobody draws themselves, and a single
 * gift circle is preferred.
 */

// Fisher-Yates array shuffle
export function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Checks if giver can give to receiver based on exclusions
 */
function canGive(giverId, receiverId, exclusions) {
  if (giverId === receiverId) return false;
  return !exclusions.some(
    (ex) => ex.giverId === giverId && ex.receiverId === receiverId
  );
}

/**
 * Finds a valid Secret Santa assignment using randomized backtracking.
 * Guarantees that nobody gets themselves, all exclusions are respected,
 * and everyone gives exactly one gift and receives exactly one gift.
 * 
 * @param {Array<{id: string, name: string}>} participants 
 * @param {Array<{giverId: string, receiverId: string}>} exclusions 
 * @param {boolean} forceSingleCycle Whether everyone should be in one big circle
 * @returns {{ success: boolean, matches?: Array<{giver: Object, receiver: Object}>, error?: string }}
 */
export function generateSecretSantaDraw(participants, exclusions = [], forceSingleCycle = true) {
  if (!participants || participants.length < 2) {
    return { success: false, error: 'At least 2 participants are required for Secret Santa.' };
  }

  const n = participants.length;
  const participantIds = participants.map((p) => p.id);
  const participantMap = new Map(participants.map((p) => [p.id, p]));

  // Try multiple random seeds for the backtracking search
  const maxAttempts = 30;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // If single cycle requested, try to build a randomized Hamiltonian cycle
    if (forceSingleCycle) {
      const shuffled = shuffleArray(participantIds);
      const visited = new Set([shuffled[0]]);
      const path = [shuffled[0]];

      function findCycle(currentIdx) {
        if (path.length === n) {
          // Check if last person can give to first person
          if (canGive(path[n - 1], path[0], exclusions)) {
            return true;
          }
          return false;
        }

        const currentId = path[path.length - 1];
        // Candidates are remaining unvisited participants who can receive from current
        const candidates = shuffleArray(
          participantIds.filter(
            (id) => !visited.has(id) && canGive(currentId, id, exclusions)
          )
        );

        for (const nextId of candidates) {
          visited.add(nextId);
          path.push(nextId);
          if (findCycle(currentIdx + 1)) return true;
          path.pop();
          visited.delete(nextId);
        }

        return false;
      }

      if (findCycle(0)) {
        // Construct matches from Hamiltonian cycle
        const matches = [];
        for (let i = 0; i < n; i++) {
          const giverId = path[i];
          const receiverId = path[(i + 1) % n];
          matches.push({
            giver: participantMap.get(giverId),
            receiver: participantMap.get(receiverId),
          });
        }
        return { success: true, matches };
      }
    }

    // Fallback: General bipartite matching / derangement backtracking without cycle constraint
    const givers = shuffleArray(participantIds);
    const assignedReceivers = new Set();
    const assignment = new Map();

    function backtrack(idx) {
      if (idx === givers.length) return true;
      const giver = givers[idx];
      const eligibleReceivers = shuffleArray(
        participantIds.filter(
          (receiver) =>
            !assignedReceivers.has(receiver) &&
            canGive(giver, receiver, exclusions)
        )
      );

      for (const receiver of eligibleReceivers) {
        assignedReceivers.add(receiver);
        assignment.set(giver, receiver);

        if (backtrack(idx + 1)) return true;

        assignment.delete(giver);
        assignedReceivers.delete(receiver);
      }
      return false;
    }

    if (backtrack(0)) {
      const matches = [];
      for (const p of participants) {
        const receiverId = assignment.get(p.id);
        matches.push({
          giver: p,
          receiver: participantMap.get(receiverId),
        });
      }
      return { success: true, matches };
    }
  }

  return {
    success: false,
    error: 'Could not find a valid pairing with these exclusion rules. Try relaxing some restrictions.',
  };
}
