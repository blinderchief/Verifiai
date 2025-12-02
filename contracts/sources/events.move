/// @title VerifiAI Events
/// @notice Event definitions for the VerifiAI Protocol
/// @dev All events are emitted to enable off-chain indexing and monitoring
module verifiai::events {
    use std::string::String;
    use aptos_framework::event;

    friend verifiai::verifier;
    friend verifiai::registry;
    friend verifiai::coordinator;
    friend verifiai::settlement;

    // ============ Proof Events ============

    /// Emitted when a new ZK proof is submitted for verification
    #[event]
    struct ProofSubmitted has drop, store {
        /// Unique identifier for the proof
        proof_id: vector<u8>,
        /// Address of the submitter
        submitter: address,
        /// Type of proof (groth16, bulletproofs, hybrid)
        proof_type: String,
        /// Hash of the model used for inference
        model_hash: vector<u8>,
        /// Timestamp of submission
        timestamp: u64,
    }

    /// Emitted when a proof is successfully verified
    #[event]
    struct ProofVerified has drop, store {
        /// Unique identifier for the proof
        proof_id: vector<u8>,
        /// Whether verification succeeded
        is_valid: bool,
        /// Gas used for verification
        gas_used: u64,
        /// Verification timestamp
        verified_at: u64,
    }

    /// Emitted when a proof verification fails
    #[event]
    struct ProofRejected has drop, store {
        /// Unique identifier for the proof
        proof_id: vector<u8>,
        /// Error code for the rejection
        error_code: u64,
        /// Human-readable error message
        error_message: String,
    }

    // ============ Agent Events ============

    /// Emitted when a new AI agent is registered
    #[event]
    struct AgentRegistered has drop, store {
        /// Unique identifier for the agent
        agent_id: vector<u8>,
        /// Owner address
        owner: address,
        /// Agent name
        name: String,
        /// Agent capabilities (comma-separated)
        capabilities: String,
        /// Shelby blob URI for agent metadata
        metadata_uri: String,
    }

    /// Emitted when an agent performs a verified action
    #[event]
    struct AgentActionExecuted has drop, store {
        /// Agent identifier
        agent_id: vector<u8>,
        /// Action type
        action_type: String,
        /// Associated proof ID
        proof_id: vector<u8>,
        /// Action result hash
        result_hash: vector<u8>,
        /// Execution timestamp
        executed_at: u64,
    }

    /// Emitted when an agent is deactivated
    #[event]
    struct AgentDeactivated has drop, store {
        /// Agent identifier
        agent_id: vector<u8>,
        /// Reason for deactivation
        reason: String,
        /// Deactivation timestamp
        deactivated_at: u64,
    }

    // ============ Coordination Events ============

    /// Emitted when a new agent swarm is created
    #[event]
    struct SwarmCreated has drop, store {
        /// Unique swarm identifier
        swarm_id: vector<u8>,
        /// Creator address
        creator: address,
        /// Initial member count
        member_count: u64,
        /// Shelby blob for shared memory
        shared_memory_uri: String,
    }

    /// Emitted when an agent joins a swarm
    #[event]
    struct AgentJoinedSwarm has drop, store {
        /// Swarm identifier
        swarm_id: vector<u8>,
        /// Agent identifier
        agent_id: vector<u8>,
        /// Join timestamp
        joined_at: u64,
    }

    /// Emitted when shared memory is updated
    #[event]
    struct SharedMemoryUpdated has drop, store {
        /// Swarm identifier
        swarm_id: vector<u8>,
        /// Agent that updated memory
        updated_by: vector<u8>,
        /// New memory state hash
        state_hash: vector<u8>,
        /// Update timestamp
        updated_at: u64,
    }

    // ============ RWA Settlement Events ============

    /// Emitted when an RWA settlement is initiated
    #[event]
    struct SettlementInitiated has drop, store {
        /// Settlement identifier
        settlement_id: vector<u8>,
        /// Asset type
        asset_type: String,
        /// Value in base units
        value: u64,
        /// Proof ID for the AI decision
        proof_id: vector<u8>,
        /// Initiator address
        initiator: address,
    }

    /// Emitted when a settlement is completed
    #[event]
    struct SettlementCompleted has drop, store {
        /// Settlement identifier
        settlement_id: vector<u8>,
        /// Final status
        status: String,
        /// Completion timestamp
        completed_at: u64,
    }

    // ============ Helper Functions ============

    /// Emit a proof submitted event
    public(friend) fun emit_proof_submitted(
        proof_id: vector<u8>,
        submitter: address,
        proof_type: String,
        model_hash: vector<u8>,
        timestamp: u64
    ) {
        event::emit(ProofSubmitted {
            proof_id,
            submitter,
            proof_type,
            model_hash,
            timestamp,
        });
    }

    /// Emit a proof verified event
    public(friend) fun emit_proof_verified(
        proof_id: vector<u8>,
        is_valid: bool,
        gas_used: u64,
        verified_at: u64
    ) {
        event::emit(ProofVerified {
            proof_id,
            is_valid,
            gas_used,
            verified_at,
        });
    }

    /// Emit a proof rejected event
    public(friend) fun emit_proof_rejected(
        proof_id: vector<u8>,
        error_code: u64,
        error_message: String
    ) {
        event::emit(ProofRejected {
            proof_id,
            error_code,
            error_message,
        });
    }

    /// Emit an agent registered event
    public(friend) fun emit_agent_registered(
        agent_id: vector<u8>,
        owner: address,
        name: String,
        capabilities: String,
        metadata_uri: String
    ) {
        event::emit(AgentRegistered {
            agent_id,
            owner,
            name,
            capabilities,
            metadata_uri,
        });
    }

    /// Emit an agent action executed event
    public(friend) fun emit_agent_action_executed(
        agent_id: vector<u8>,
        action_type: String,
        proof_id: vector<u8>,
        result_hash: vector<u8>,
        executed_at: u64
    ) {
        event::emit(AgentActionExecuted {
            agent_id,
            action_type,
            proof_id,
            result_hash,
            executed_at,
        });
    }

    /// Emit an agent deactivated event
    public(friend) fun emit_agent_deactivated(
        agent_id: vector<u8>,
        reason: String,
        deactivated_at: u64
    ) {
        event::emit(AgentDeactivated {
            agent_id,
            reason,
            deactivated_at,
        });
    }

    /// Emit a swarm created event
    public(friend) fun emit_swarm_created(
        swarm_id: vector<u8>,
        creator: address,
        member_count: u64,
        shared_memory_uri: String
    ) {
        event::emit(SwarmCreated {
            swarm_id,
            creator,
            member_count,
            shared_memory_uri,
        });
    }

    /// Emit an agent joined swarm event
    public(friend) fun emit_agent_joined_swarm(
        swarm_id: vector<u8>,
        agent_id: vector<u8>,
        joined_at: u64
    ) {
        event::emit(AgentJoinedSwarm {
            swarm_id,
            agent_id,
            joined_at,
        });
    }

    /// Emit a shared memory updated event
    public(friend) fun emit_shared_memory_updated(
        swarm_id: vector<u8>,
        updated_by: vector<u8>,
        state_hash: vector<u8>,
        updated_at: u64
    ) {
        event::emit(SharedMemoryUpdated {
            swarm_id,
            updated_by,
            state_hash,
            updated_at,
        });
    }

    /// Emit a settlement initiated event
    public(friend) fun emit_settlement_initiated(
        settlement_id: vector<u8>,
        asset_type: String,
        value: u64,
        proof_id: vector<u8>,
        initiator: address
    ) {
        event::emit(SettlementInitiated {
            settlement_id,
            asset_type,
            value,
            proof_id,
            initiator,
        });
    }

    /// Emit a settlement completed event
    public(friend) fun emit_settlement_completed(
        settlement_id: vector<u8>,
        status: String,
        completed_at: u64
    ) {
        event::emit(SettlementCompleted {
            settlement_id,
            status,
            completed_at,
        });
    }
}
