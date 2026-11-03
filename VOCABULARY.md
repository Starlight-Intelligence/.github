# The Starlight Vocabulary

**Version 1.0.0** · Published 3 November 2026 · Companion to [the Starlight Charter](./CHARTER.md)

One word, one meaning. When a Starlight document, team card or agent instruction uses one of these terms, it means exactly what is written here. The article numbers point to where the [charter](./CHARTER.md) relies on the term.

---

## People and agents

**Founder.** The person who sets intent for a fleet: the goal, the scope, the limits and the money. A fleet can have more than one, and each is named. (Article 1)

**Fleet.** All the agents working for one founder or one company, across every tool and provider they run on. (Articles 1, 2)

**Agent.** One AI worker with a name, a job and a checker. Two runs of the same model with different jobs are two agents. (Article 2)

**Team card.** The written record of a fleet: for each agent, who it is, what it answers for, where it runs, what it may touch, what it may spend and who checks it. Anything not listed for publication on a card stays private. (Article 2)

**Steward.** An agent that looks after one domain over time, such as releases, security or content, and reports on its health. A steward recommends; the founder decides.

**Harness.** The tool an agent runs inside, such as a coding CLI or an IDE assistant. One harness can host many agents.

## Doing the work

**Maker.** The agent that produces a change. (Article 3)

**Checker.** The agent that judges a maker's change. It comes from a different provider than the maker, and it never edits the change it judges. Also called a grader. (Article 3)

**Contract.** The finish line, written before work starts: the goal, the checks that must pass and the paths that must not change. Its identity is a hash of its content, so it cannot change quietly after work begins. (Article 4)

**Protected path.** A file or folder the contract says no maker may change, usually the tests that define done. Changing one fails the task. (Article 4)

**Artifact.** The exact output being judged, identified by its content hash or commit. (Article 5)

**Receipt.** A signed record that one artifact passed one contract against one starting point, under a stated policy and isolation. It is checked with a public key. If any of those inputs changes, the receipt is no longer valid. (Article 5)

**Isolation.** Where the candidate code ran while it was checked, written on the receipt: as the operator's own user, or in a locked-down container. A receipt never claims more isolation than actually ran. (Article 5)

**Lane.** An exclusive claim that one agent is writing to a stated set of paths until a stated expiry. A new claim is refused while a live claim overlaps it, and an agent whose claim has expired stops writing until it claims again. Lanes work alongside isolation: each writer still works on its own branch or copy.

**Handover.** The written state an agent leaves when it stops: what is done, what is not, and the next step, so another agent or person can continue without guessing.

## Learning and truth

**Lesson.** Something an agent proposes it learned from a task. (Article 6)

**Quarantine.** Where lessons wait until a person adopts or rejects them. Only adopted lessons reach the next agent. (Article 6)

**`[OPEN]`.** The one way to write a value that no ruling and no measurement has established. Never replaced by a guess. (Article 7)

**Ruled.** A decision a founder made. Only a founder changes it. (Article 7)

**Measured.** A fact produced by running something, stated with its method and date. A measurement goes stale; re-run it rather than repeat it. (Article 7)

## Limits

**Gate.** A check that must pass before something moves on, such as a merge, a release or a payment. A gate that was skipped counts as failed. (Articles 5, 8)

**Stage.** To prepare an action completely, so a person only has to approve and execute it. Agents stage; people execute. (Article 8)

**Fail closed.** When a check cannot run or its answer is unclear, the action does not happen. (Article 8)

---

## Versions

Terms follow the charter's versioning. A new term that creates no new obligation is a minor release. Changing what an existing term means, or adding one that creates an obligation, is a major release.

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-03 | First publication: 23 terms. |

Licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/), with the same name terms as [the charter](./CHARTER.md#licence-and-names).
