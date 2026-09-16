import { Lecture } from '../types';

export const SAMPLE_LECTURES: Lecture[] = [
  {
    id: 'raft-consensus',
    title: 'Distributed Systems: Raft Consensus',
    subject: 'Computer Science',
    authorOrCourse: 'CS 244B · Stanford University',
    totalPages: 6,
    createdAt: '2026-09-10',
    lastStudiedAt: '2026-09-14',
    baselineSecsPerPage: 90,
    currentPage: 1,
    totalStudySeconds: 420,
    focusPoints: 185,
    slides: [
      {
        id: 'raft-1',
        pageNumber: 1,
        title: 'Foundations of Consensus & Replicated State Machines',
        subtitle: 'The Replicated Log Pattern in Distributed Computing',
        topic: 'State Machine Replication',
        densityScore: 3,
        diagramType: 'architecture',
        diagramData: {
          nodes: ['Clients', 'Leader Node', 'Replicated Log', 'State Machine'],
          description: 'Deterministic state machine replicas execute identical logs in the same order.'
        },
        content: [
          'Consensus allows a collection of distributed nodes to agree on a shared sequence of operations, tolerating fail-stop network partitions and node crashes.',
          'Under the Replicated State Machine (RSM) model, all servers hold an identical state machine and an ordered append-only log.',
          'If all replicas apply log entry i to their state machine in identical order, they will reach identical deterministic states.',
          'Raft decomposes consensus into three independent sub-problems: Leader Election, Log Replication, and Safety Invariants.'
        ],
        keyPoints: [
          'Deterministic state machines produce identical output when given the same sequence of inputs.',
          'Consensus ensures safety even during partial network partitions (as long as a quorum/majority survives).',
          'Raft is designed explicitly for understandability compared to multi-Paxos.'
        ],
        externalCitations: ['Ongaro & Ousterhout (USENIX ATC 2014)']
      },
      {
        id: 'raft-2',
        pageNumber: 2,
        title: 'Server Roles & Term Transitions',
        subtitle: 'Follower, Candidate, and Leader States',
        topic: 'Role State Transitions',
        densityScore: 2,
        diagramType: 'flowchart',
        diagramData: {
          states: ['Follower', 'Candidate', 'Leader'],
          transitions: [
            'Follower times out -> converts to Candidate & starts election',
            'Candidate collects majority votes -> converts to Leader',
            'Candidate discovers Leader or newer term -> steps down to Follower',
            'Leader receives RPC with higher term -> steps down to Follower'
          ]
        },
        content: [
          'At any given time, each server is in one of three states: Follower, Candidate, or Leader.',
          'Time is divided into arbitrary terms, numbered with consecutive integers. Each term begins with an election.',
          'Followers are passive: they respond to incoming RPCs but initiate no communication.',
          'If a follower receives no communication over an randomized election timeout period (e.g. 150-300ms), it assumes no viable leader exists.'
        ],
        keyPoints: [
          'Terms act as logical clocks in Raft, allowing servers to detect stale leaders or obsolete RPCs.',
          'Only one leader can be elected per term; terms with split votes end without a leader.'
        ]
      },
      {
        id: 'raft-3',
        pageNumber: 3,
        title: 'Leader Election & Split Vote Mitigation',
        subtitle: 'Quorum Rules and Randomized Timeouts',
        topic: 'Leader Election Mechanism',
        densityScore: 4,
        diagramType: 'table',
        diagramData: {
          headers: ['Parameter', 'Value Range', 'Design Purpose'],
          rows: [
            ['Election Timeout', '150ms – 300ms', 'Randomized per node to prevent simultaneous candidate transitions.'],
            ['Heartbeat Interval', '20ms – 50ms', 'Maintains leader authority before followers timeout.'],
            ['Quorum Majority', '⌊N/2⌋ + 1', 'Guarantees overlapping intersection across any two quorums.']
          ]
        },
        content: [
          'To begin an election, a follower increments its current term, votes for itself, and broadcasts RequestVote RPCs.',
          'A candidate wins an election if it receives votes from a strict majority (quorum) of all nodes in the cluster for the same term.',
          'Split votes occur if multiple followers become candidates simultaneously and split the votes evenly.',
          'Raft solves split votes simply and elegantly using randomized election timeouts: one candidate almost always times out first and captures the majority before rivals wake up.'
        ],
        keyPoints: [
          'Strict majority rule ensures at most one leader can be elected per term.',
          'Randomized timeouts break election symmetry with minimal extra communication overhead.',
          'Nodes grant only one vote per term on a first-come, first-served basis (subject to log completeness checks).'
        ]
      },
      {
        id: 'raft-4',
        pageNumber: 4,
        title: 'Log Replication & AppendEntries RPC',
        subtitle: 'Log Consistency Check and Two-Phase Commit',
        topic: 'Log Replication',
        densityScore: 4,
        diagramType: 'flowchart',
        diagramData: {
          steps: [
            'Client sends command to Leader',
            'Leader appends entry to its local log',
            'Leader sends AppendEntries RPC to all Followers',
            'Followers verify prevLogIndex and prevLogTerm match',
            'Once replicated on majority, entry is Committed',
            'Leader applies to State Machine and replies to Client'
          ]
        },
        content: [
          'Once elected, the leader handles all client requests. Each request contains a command to be executed by the replicated state machine.',
          'The leader appends the command to its own log as a new entry, then sends AppendEntries RPCs in parallel to all followers.',
          'Log Consistency Property: If two logs contain an entry with the same index and term, they are identical up to that entry.',
          'When an AppendEntries RPC is rejected due to log inconsistency, the leader decrements nextIndex for that follower until a matching entry is found, then overwrites conflicting entries.'
        ],
        keyPoints: [
          'An entry is committed once replicated across a majority of servers.',
          'Followers overwrite their local uncommitted logs to strictly match the leader.',
          'Leaders never overwrite or truncate their own logs; communication is strictly leader-to-follower.'
        ]
      },
      {
        id: 'raft-5',
        pageNumber: 5,
        title: 'Raft Safety Invariants',
        subtitle: 'Leader Completeness & Election Restriction',
        topic: 'Safety Guarantees',
        densityScore: 5,
        diagramType: 'equation',
        diagramData: {
          formula: 'Quorum_election ∩ Quorum_commit ≠ ∅',
          implication: 'Any elected leader is guaranteed to contain every committed entry from all prior terms.'
        },
        content: [
          'Election Restriction: RequestVote RPC includes candidate\'s last log index and term. A voter denies its vote if its own log is more up-to-date than the candidate\'s log.',
          'Up-to-date comparison: A log with a higher term at the last entry is more up-to-date. If terms are equal, the longer log is more up-to-date.',
          'Leader Completeness Property: If a log entry is committed in a given term, that entry will be present in the logs of the leaders for all higher-numbered terms.',
          'State Machine Safety: If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for that index.'
        ],
        keyPoints: [
          'Safety requires no log transfer from follower to leader; leaders are already authoritative upon election.',
          'Log completeness check guarantees that the leader elected has every committed entry.',
          'Leaders never commit an entry from a prior term by counting replicas; they only commit prior entries indirectly by committing an entry from their current term.'
        ]
      },
      {
        id: 'raft-6',
        pageNumber: 6,
        title: 'Network Partitions & Cluster Recovery',
        subtitle: 'Handling Asymmetric Partitions and Stale Leaders',
        topic: 'Fault Tolerance & Partitions',
        densityScore: 3,
        diagramType: 'architecture',
        diagramData: {
          partitions: [
            'Majority Partition (3 of 5 nodes): Elects new leader, continues committing client writes.',
            'Minority Partition (2 of 5 nodes): Stale leader cannot reach quorum, writes stay uncommitted.',
            'Reconnection: Stale leader discovers higher term, steps down; minority logs roll back.'
          ]
        },
        content: [
          'When a network partition splits a 5-node cluster into {S1, S2} and {S3, S4, S5}:',
          'The minority partition {S1, S2} cannot form a quorum (2 < 3). The leader S1 may receive writes, but cannot commit them.',
          'The majority partition {S3, S4, S5} will elect a new leader with a higher term and commit client operations safely.',
          'Upon partition healing, S1 receives an AppendEntries RPC with a higher term, immediately reverts to Follower, and reconciles its uncommitted logs to match the majority.'
        ],
        keyPoints: [
          'Partitions cannot cause split-brain data corruption because a quorum requires > 50% of all configured cluster nodes.',
          'Uncommitted entries on partitioned minority nodes are safely rolled back upon healing.'
        ]
      }
    ]
  },
  {
    id: 'cellular-respiration',
    title: 'Biochemistry: Cellular Respiration & ATP',
    subject: 'Molecular Biology',
    authorOrCourse: 'Bio 102 · Harvard University',
    totalPages: 6,
    createdAt: '2026-09-08',
    lastStudiedAt: '2026-09-13',
    baselineSecsPerPage: 80,
    currentPage: 1,
    totalStudySeconds: 310,
    focusPoints: 140,
    slides: [
      {
        id: 'bio-1',
        pageNumber: 1,
        title: 'Metabolic Overview & Glycolysis',
        subtitle: 'Cytoplasmic Splitting of Glucose into Pyruvate',
        topic: 'Glycolysis',
        densityScore: 3,
        diagramType: 'cycle',
        diagramData: {
          inputs: '1 Glucose + 2 NAD+ + 2 ADP + 2 Pi',
          outputs: '2 Pyruvate + 2 NADH + 2 ATP (net)'
        },
        content: [
          'Cellular respiration is the catabolic pathway by which organic molecules are oxidized to yield chemical energy stored in ATP.',
          'Glycolysis occurs in the cytosol and does not require molecular oxygen (anaerobic).',
          'The energy investment phase uses 2 ATP molecules to phosphorylate glucose into fructose-1,6-bisphosphate.',
          'The energy payoff phase produces 4 ATP via substrate-level phosphorylation and 2 NADH molecules, yielding a net gain of 2 ATP per glucose.'
        ],
        keyPoints: [
          'Glycolysis produces net 2 ATP, 2 NADH, and 2 pyruvate molecules per glucose.',
          'Phosphofructokinase-1 (PFK-1) is the primary allosteric rate-limiting enzyme, inhibited by ATP and activated by AMP.'
        ]
      },
      {
        id: 'bio-2',
        pageNumber: 2,
        title: 'Pyruvate Decarboxylation (The Link Reaction)',
        subtitle: 'Transition from Cytosol to Mitochondrial Matrix',
        topic: 'Pyruvate Dehydrogenase Complex',
        densityScore: 3,
        content: [
          'Pyruvate enters the mitochondrion via pyruvate translocase in the inner mitochondrial membrane.',
          'The Pyruvate Dehydrogenase Complex (PDC) catalyzes the irreversible oxidative decarboxylation of pyruvate into Acetyl-CoA.',
          'During this reaction, one carbon is released as CO2, and NAD+ is reduced to NADH.',
          'Acetyl-CoA serves as the universal two-carbon metabolic fuel for the citric acid cycle.'
        ],
        keyPoints: [
          'PDC requires 5 essential cofactors: TPP, Lipoamide, FAD, NAD+, and Coenzyme A.',
          'Produces 1 NADH and 1 CO2 per pyruvate (2 of each per glucose).'
        ]
      },
      {
        id: 'bio-3',
        pageNumber: 3,
        title: 'The Citric Acid Cycle (Krebs Cycle)',
        subtitle: 'Complete Oxidation of Acetyl Groups in Matrix',
        topic: 'Krebs Cycle',
        densityScore: 4,
        diagramType: 'cycle',
        diagramData: {
          cycle: 'Oxaloacetate (4C) + Acetyl-CoA (2C) -> Citrate (6C) -> Isocitrate -> α-Ketoglutarate -> Succinyl-CoA -> Succinate -> Fumarate -> Malate -> Oxaloacetate'
        },
        content: [
          'The Krebs cycle operates in the mitochondrial matrix, oxidizing Acetyl-CoA to CO2 while harvesting high-energy electrons.',
          'For each turn of the cycle (per Acetyl-CoA): 3 NADH, 1 FADH2, 1 GTP (or ATP via substrate phosphorylation), and 2 CO2 are produced.',
          'Because 1 glucose yields 2 Acetyl-CoA molecules, the cycle turns twice per glucose.',
          'Oxaloacetate is regenerated at the end of each cycle, ready to condense with a new Acetyl-CoA molecule.'
        ],
        keyPoints: [
          'Per glucose: 6 NADH, 2 FADH2, 2 GTP/ATP, and 4 CO2 released.',
          'Isocitrate dehydrogenase is the main rate-limiting regulatory enzyme, inhibited by high NADH/ATP.'
        ]
      },
      {
        id: 'bio-4',
        pageNumber: 4,
        title: 'The Electron Transport Chain (ETC)',
        subtitle: 'Complexes I–IV on the Inner Mitochondrial Membrane',
        topic: 'Electron Transport Chain',
        densityScore: 5,
        diagramType: 'architecture',
        diagramData: {
          complexes: [
            'Complex I (NADH-Q oxidoreductase): pumps 4 H+',
            'Complex II (Succinate-Q reductase): transfers electrons from FADH2, no H+ pump',
            'Complex III (Q-cytochrome c oxidoreductase): pumps 4 H+ via Q-cycle',
            'Complex IV (Cytochrome c oxidase): transfers e- to O2, forming H2O, pumps 2 H+'
          ]
        },
        content: [
          'High-energy electrons from NADH and FADH2 are transferred along a sequence of protein complexes in the inner membrane.',
          'Complex I accepts electrons from NADH and transfers them to Coenzyme Q (Ubiquinone), pumping 4 protons into the intermembrane space.',
          'Complex II accepts electrons from FADH2 without pumping protons.',
          'Complex IV transfers electrons to molecular oxygen (O2), the terminal electron acceptor, reducing it to water (H2O).'
        ],
        keyPoints: [
          'Oxygen is the terminal electron acceptor; without O2, the entire ETC halts.',
          'Pumping protons against their gradient from matrix to intermembrane space creates the electrochemical proton-motive force.'
        ]
      },
      {
        id: 'bio-5',
        pageNumber: 5,
        title: 'Chemiosmosis & The Proton-Motive Force',
        subtitle: 'Mitchell Hypothesis of Electrochemical Coupling',
        topic: 'Proton-Motive Force',
        densityScore: 4,
        diagramType: 'equation',
        diagramData: {
          formula: 'Δp = ΔΨ - (2.303 RT / F) ΔpH',
          components: 'Membrane potential (ΔΨ, ~160mV) + pH gradient (ΔpH, ~0.75 units)'
        },
        content: [
          'Peter Mitchell\'s chemiosmotic hypothesis established that electron transport and ATP synthesis are coupled through a transmembrane electrochemical gradient.',
          'The intermembrane space accumulates high proton concentration (low pH, positive charge), while the matrix is low in protons (higher pH, negative charge).',
          'The inner mitochondrial membrane is strictly impermeable to protons, preventing dissipation except through ATP synthase channels.',
          'Uncoupling agents (such as DNP or thermogenin) allow protons to leak across the membrane, releasing energy as heat without producing ATP.'
        ],
        keyPoints: [
          'Proton-motive force consists of both an electrical membrane potential and a chemical pH gradient.',
          'The inner membrane\'s proton impermeability is mandatory for coupling.'
        ]
      },
      {
        id: 'bio-6',
        pageNumber: 6,
        title: 'ATP Synthase (Complex V) Rotary Motor',
        subtitle: 'Binding-Change Mechanism of F0 and F1 Subunits',
        topic: 'ATP Synthase Mechanics',
        densityScore: 5,
        diagramType: 'architecture',
        diagramData: {
          structure: 'F0 subunit (membrane rotor ring + stator) & F1 subunit (α3β3 catalytic head in matrix)',
          conformations: 'Open (O) binds ADP+Pi -> Loose (L) aligns substrates -> Tight (T) synthesizes ATP'
        },
        content: [
          'ATP Synthase acts as a molecular turbine consisting of two primary components: F0 (hydrophobic membrane embedded) and F1 (catalytic matrix head).',
          'Protons flow through the half-channels of the a-subunit, protonating an aspartate residue on the c-ring, inducing mechanical rotation of the c-ring.',
          'Rotation of the central γ-shaft alters the conformations of the three catalytic β-subunits in the F1 head according to Paul Boyer\'s binding-change mechanism.',
          'Overall yield: Approximately 30 to 32 ATP molecules produced per oxidized glucose molecule.'
        ],
        keyPoints: [
          'Proton flow drives mechanical rotation, which induces conformational changes (Open -> Loose -> Tight) in catalytic sites.',
          'Mechanical energy is transduced directly into high-energy phosphoanhydride bonds of ATP.'
        ]
      }
    ]
  },
  {
    id: 'market-equilibrium',
    title: 'Economics: Supply, Demand & Elasticity',
    subject: 'Microeconomics',
    authorOrCourse: 'Econ 101 · Princeton University',
    totalPages: 5,
    createdAt: '2026-09-05',
    lastStudiedAt: '2026-09-12',
    baselineSecsPerPage: 75,
    currentPage: 1,
    totalStudySeconds: 280,
    focusPoints: 120,
    slides: [
      {
        id: 'econ-1',
        pageNumber: 1,
        title: 'The Law of Demand & Supply Dynamics',
        subtitle: 'Price Mechanisms and Determinants of Shifts',
        topic: 'Supply and Demand Fundamentals',
        densityScore: 3,
        content: [
          'The Law of Demand states that, ceteris paribus, as the price of a good increases, the quantity demanded decreases.',
          'A change in price causes a movement along the curve. A change in non-price factors (income, tastes, price of substitutes/complements) causes a shift of the entire demand curve.',
          'The Law of Supply states that sellers offer more of a good at higher prices, reflecting rising marginal costs of production.',
          'Supply shifts occur when input costs, technology, number of sellers, or government regulations change.'
        ],
        keyPoints: [
          'Movement along curve = price change only.',
          'Shift of curve = changes in exogenous determinants (income, input costs, expectations).'
        ]
      },
      {
        id: 'econ-2',
        pageNumber: 2,
        title: 'Market Equilibrium & Market Clearing Price',
        subtitle: 'Price Discovery, Shortages, and Surpluses',
        topic: 'Market Equilibrium',
        densityScore: 3,
        content: [
          'Market equilibrium occurs at the intersection of supply and demand curves, where Quantity Demanded (Qd) = Quantity Supplied (Qs).',
          'If price is above equilibrium, quantity supplied exceeds quantity demanded, creating a surplus (excess supply); competition among sellers pushes prices down.',
          'If price is below equilibrium, quantity demanded exceeds quantity supplied, creating a shortage (excess demand); buyers bid prices up.',
          'The invisible hand coordinates decentralized resource allocation through these automatic price adjustments.'
        ],
        keyPoints: [
          'At equilibrium price P*, there is neither surplus nor shortage.',
          'Markets clear spontaneously without central planning when prices are flexible.'
        ]
      },
      {
        id: 'econ-3',
        pageNumber: 3,
        title: 'Price Elasticity of Demand (PED)',
        subtitle: 'Responsiveness of Quantity to Price Variations',
        topic: 'Price Elasticity of Demand',
        densityScore: 4,
        diagramType: 'equation',
        diagramData: {
          formula: 'PED = (% ΔQd) / (% ΔP) = [(Q2 - Q1) / Qavg] / [(P2 - P1) / Pavg]',
          interpretation: '|PED| > 1: Elastic (Total Revenue falls with price hike); |PED| < 1: Inelastic (Total Revenue rises with price hike)'
        },
        content: [
          'Price Elasticity of Demand measures how sensitive the quantity demanded is to a change in price.',
          'Calculated using the midpoint formula to ensure symmetrical elasticity regardless of direction.',
          'When demand is elastic (|PED| > 1), a price increase causes total revenue to decrease.',
          'When demand is inelastic (|PED| < 1), consumers cannot easily substitute away, so a price increase increases total revenue.'
        ],
        keyPoints: [
          'Determinants of elasticity: availability of close substitutes, necessity vs luxury, proportion of income, and time horizon.',
          'Goods with many close substitutes have high elasticity.'
        ]
      },
      {
        id: 'econ-4',
        pageNumber: 4,
        title: 'Consumer Surplus, Producer Surplus & Efficiency',
        subtitle: 'Welfare Economics and Total Societal Gains',
        topic: 'Welfare Economics',
        densityScore: 4,
        content: [
          'Consumer Surplus (CS) is the difference between what consumers are willing to pay and the market price they actually pay (area under demand curve above P*).',
          'Producer Surplus (PS) is the difference between the market price and the minimum marginal cost at which producers are willing to sell (area above supply curve below P*).',
          'Total Economic Surplus (CS + PS) is maximized at competitive market equilibrium, achieving Pareto allocative efficiency.',
          'At this point, goods are produced by lowest-cost sellers and consumed by buyers who value them most.'
        ],
        keyPoints: [
          'Competitive equilibrium maximizes total surplus without deadweight loss.',
          'Any deviation from equilibrium reduces overall economic welfare.'
        ]
      },
      {
        id: 'econ-5',
        pageNumber: 5,
        title: 'Deadweight Loss & Government Interventions',
        subtitle: 'Taxes, Subsidies, Price Ceilings & Floors',
        topic: 'Government Intervention & DWL',
        densityScore: 4,
        content: [
          'A tax drives a tax wedge between the price buyers pay and the price sellers receive, reducing equilibrium quantity.',
          'Deadweight Loss (DWL) is the reduction in total economic surplus that results from a market distortion such as a tax or monopoly pricing.',
          'The Harberger triangle measures DWL: mutually beneficial trades that are prevented from occurring.',
          'The size of deadweight loss depends directly on elasticities: more elastic supply and demand lead to larger deadweight loss from a given tax.'
        ],
        keyPoints: [
          'Deadweight loss represents uncaptured welfare that benefits neither buyers, sellers, nor the government.',
          'More elastic curves create larger deadweight loss because quantities respond more severely to the tax.'
        ]
      }
    ]
  }
];
