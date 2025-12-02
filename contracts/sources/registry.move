/// @title VerifiAI Agent Registry
/// @notice Registry for AI agents with verified inference capabilities
/// @dev Manages agent registration, capabilities, and proof associations
module verifiai::registry {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use verifiai::events;

    // ============ Error Codes ============
    
    /// Agent already registered
    const E_AGENT_EXISTS: u64 = 1;
    /// Agent not found
    const E_AGENT_NOT_FOUND: u64 = 2;
    /// Not the agent owner
    const E_NOT_OWNER: u64 = 3;
    /// Agent is inactive
    const E_AGENT_INACTIVE: u64 = 4;
    /// Invalid capability
    const E_INVALID_CAPABILITY: u64 = 5;
    /// Maximum agents reached
    const E_MAX_AGENTS_REACHED: u64 = 6;

    // ============ Constants ============
    
    /// Maximum agents per owner
    const MAX_AGENTS_PER_OWNER: u64 = 100;
    /// Maximum capabilities per agent
    const MAX_CAPABILITIES: u64 = 20;

    // Agent capability types
    const CAP_INFERENCE: u8 = 1;
    const CAP_RWA_SETTLEMENT: u8 = 2;
    const CAP_CONTENT_VERIFICATION: u8 = 3;
    const CAP_ROYALTY_PROCESSING: u8 = 4;
    const CAP_DATA_ANALYSIS: u8 = 5;
    const CAP_SWARM_COORDINATION: u8 = 6;

    // ============ Structs ============

    /// Agent capability definition
    struct Capability has store, copy, drop {
        /// Capability type identifier
        cap_type: u8,
        /// Human-readable name
        name: String,
        /// Whether this capability is enabled
        enabled: bool,
        /// Last used timestamp
        last_used: u64,
    }

    /// Agent proof history entry
    struct ProofHistoryEntry has store, copy, drop {
        /// Proof ID
        proof_id: vector<u8>,
        /// Action performed
        action: String,
        /// Timestamp
        timestamp: u64,
        /// Whether the proof was verified
        verified: bool,
    }

    /// Complete agent definition
    struct Agent has store {
        /// Unique agent identifier
        id: vector<u8>,
        /// Owner address
        owner: address,
        /// Agent name
        name: String,
        /// Agent description
        description: String,
        /// Shelby blob URI for metadata/model
        metadata_uri: String,
        /// Model hash for verification
        model_hash: vector<u8>,
        /// List of capabilities
        capabilities: vector<Capability>,
        /// Proof history (last N proofs)
        proof_history: vector<ProofHistoryEntry>,
        /// Total verified actions
        verified_actions: u64,
        /// Registration timestamp
        registered_at: u64,
        /// Last activity timestamp
        last_active: u64,
        /// Whether agent is active
        is_active: bool,
        /// Reputation score (0-1000)
        reputation: u64,
    }

    /// Global registry state
    struct Registry has key {
        /// Admin address
        admin: address,
        /// Total registered agents
        total_agents: u64,
        /// Active agents count
        active_agents: u64,
        /// Registration fee in APT
        registration_fee: u64,
    }

    /// Agent storage
    struct AgentStorage has key {
        /// Map from agent_id to Agent
        agents: Table<vector<u8>, Agent>,
        /// Map from owner to their agent IDs
        owner_agents: Table<address, vector<vector<u8>>>,
        /// Map from model_hash to agent IDs using that model
        model_agents: Table<vector<u8>, vector<vector<u8>>>,
    }

    // ============ Initialization ============

    /// Initialize the registry module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, Registry {
            admin: admin_addr,
            total_agents: 0,
            active_agents: 0,
            registration_fee: 1000000, // 0.01 APT
        });
        
        move_to(admin, AgentStorage {
            agents: table::new(),
            owner_agents: table::new(),
            model_agents: table::new(),
        });
    }

    // ============ Registration Functions ============

    /// Register a new AI agent
    public entry fun register_agent(
        owner: &signer,
        agent_id: vector<u8>,
        name: String,
        description: String,
        metadata_uri: String,
        model_hash: vector<u8>,
        capability_types: vector<u8>
    ) acquires Registry, AgentStorage {
        let owner_addr = signer::address_of(owner);
        let storage = borrow_global_mut<AgentStorage>(@verifiai);
        
        // Ensure agent doesn't exist
        assert!(!table::contains(&storage.agents, agent_id), error::already_exists(E_AGENT_EXISTS));
        
        // Check owner hasn't exceeded limit
        if (table::contains(&storage.owner_agents, owner_addr)) {
            let owner_agent_count = vector::length(table::borrow(&storage.owner_agents, owner_addr));
            assert!(owner_agent_count < MAX_AGENTS_PER_OWNER, error::resource_exhausted(E_MAX_AGENTS_REACHED));
        };
        
        // Build capabilities from types
        let capabilities = vector::empty<Capability>();
        let i = 0;
        let len = vector::length(&capability_types);
        while (i < len && i < MAX_CAPABILITIES) {
            let cap_type = *vector::borrow(&capability_types, i);
            let cap_name = get_capability_name(cap_type);
            vector::push_back(&mut capabilities, Capability {
                cap_type,
                name: cap_name,
                enabled: true,
                last_used: 0,
            });
            i = i + 1;
        };
        
        let now = timestamp::now_microseconds();
        
        // Create agent
        let agent = Agent {
            id: agent_id,
            owner: owner_addr,
            name,
            description,
            metadata_uri,
            model_hash,
            capabilities,
            proof_history: vector::empty(),
            verified_actions: 0,
            registered_at: now,
            last_active: now,
            is_active: true,
            reputation: 500, // Start with neutral reputation
        };
        
        // Store agent
        table::add(&mut storage.agents, agent_id, agent);
        
        // Track by owner
        if (!table::contains(&storage.owner_agents, owner_addr)) {
            table::add(&mut storage.owner_agents, owner_addr, vector::empty());
        };
        let owner_agents = table::borrow_mut(&mut storage.owner_agents, owner_addr);
        vector::push_back(owner_agents, agent_id);
        
        // Track by model
        if (!table::contains(&storage.model_agents, model_hash)) {
            table::add(&mut storage.model_agents, model_hash, vector::empty());
        };
        let model_agents = table::borrow_mut(&mut storage.model_agents, model_hash);
        vector::push_back(model_agents, agent_id);
        
        // Update registry stats
        let registry = borrow_global_mut<Registry>(@verifiai);
        registry.total_agents = registry.total_agents + 1;
        registry.active_agents = registry.active_agents + 1;
        
        // Build capabilities string for event
        let caps_str = string::utf8(b"");
        
        // Emit event
        events::emit_agent_registered(
            agent_id,
            owner_addr,
            name,
            caps_str,
            metadata_uri
        );
    }

    /// Record an agent action with associated proof
    public entry fun record_agent_action(
        owner: &signer,
        agent_id: vector<u8>,
        action_type: String,
        proof_id: vector<u8>,
        result_hash: vector<u8>,
        was_verified: bool
    ) acquires AgentStorage {
        let owner_addr = signer::address_of(owner);
        let storage = borrow_global_mut<AgentStorage>(@verifiai);
        
        assert!(table::contains(&storage.agents, agent_id), error::not_found(E_AGENT_NOT_FOUND));
        
        let agent = table::borrow_mut(&mut storage.agents, agent_id);
        assert!(agent.owner == owner_addr, error::permission_denied(E_NOT_OWNER));
        assert!(agent.is_active, error::unavailable(E_AGENT_INACTIVE));
        
        let now = timestamp::now_microseconds();
        
        // Add to proof history (keep last 50)
        let entry = ProofHistoryEntry {
            proof_id,
            action: action_type,
            timestamp: now,
            verified: was_verified,
        };
        
        if (vector::length(&agent.proof_history) >= 50) {
            vector::remove(&mut agent.proof_history, 0);
        };
        vector::push_back(&mut agent.proof_history, entry);
        
        // Update stats
        if (was_verified) {
            agent.verified_actions = agent.verified_actions + 1;
            // Increase reputation for verified actions
            if (agent.reputation < 1000) {
                agent.reputation = agent.reputation + 1;
            };
        };
        agent.last_active = now;
        
        // Emit event
        events::emit_agent_action_executed(
            agent_id,
            action_type,
            proof_id,
            result_hash,
            now
        );
    }

    /// Deactivate an agent
    public entry fun deactivate_agent(
        owner: &signer,
        agent_id: vector<u8>,
        reason: String
    ) acquires Registry, AgentStorage {
        let owner_addr = signer::address_of(owner);
        let storage = borrow_global_mut<AgentStorage>(@verifiai);
        
        assert!(table::contains(&storage.agents, agent_id), error::not_found(E_AGENT_NOT_FOUND));
        
        let agent = table::borrow_mut(&mut storage.agents, agent_id);
        assert!(agent.owner == owner_addr, error::permission_denied(E_NOT_OWNER));
        
        agent.is_active = false;
        
        let registry = borrow_global_mut<Registry>(@verifiai);
        if (registry.active_agents > 0) {
            registry.active_agents = registry.active_agents - 1;
        };
        
        let now = timestamp::now_microseconds();
        events::emit_agent_deactivated(agent_id, reason, now);
    }

    /// Reactivate an agent
    public entry fun reactivate_agent(
        owner: &signer,
        agent_id: vector<u8>
    ) acquires Registry, AgentStorage {
        let owner_addr = signer::address_of(owner);
        let storage = borrow_global_mut<AgentStorage>(@verifiai);
        
        assert!(table::contains(&storage.agents, agent_id), error::not_found(E_AGENT_NOT_FOUND));
        
        let agent = table::borrow_mut(&mut storage.agents, agent_id);
        assert!(agent.owner == owner_addr, error::permission_denied(E_NOT_OWNER));
        
        agent.is_active = true;
        agent.last_active = timestamp::now_microseconds();
        
        let registry = borrow_global_mut<Registry>(@verifiai);
        registry.active_agents = registry.active_agents + 1;
    }

    /// Update agent metadata URI
    public entry fun update_metadata(
        owner: &signer,
        agent_id: vector<u8>,
        new_metadata_uri: String
    ) acquires AgentStorage {
        let owner_addr = signer::address_of(owner);
        let storage = borrow_global_mut<AgentStorage>(@verifiai);
        
        assert!(table::contains(&storage.agents, agent_id), error::not_found(E_AGENT_NOT_FOUND));
        
        let agent = table::borrow_mut(&mut storage.agents, agent_id);
        assert!(agent.owner == owner_addr, error::permission_denied(E_NOT_OWNER));
        
        agent.metadata_uri = new_metadata_uri;
        agent.last_active = timestamp::now_microseconds();
    }

    /// Add a capability to an agent
    public entry fun add_capability(
        owner: &signer,
        agent_id: vector<u8>,
        cap_type: u8
    ) acquires AgentStorage {
        let owner_addr = signer::address_of(owner);
        let storage = borrow_global_mut<AgentStorage>(@verifiai);
        
        assert!(table::contains(&storage.agents, agent_id), error::not_found(E_AGENT_NOT_FOUND));
        
        let agent = table::borrow_mut(&mut storage.agents, agent_id);
        assert!(agent.owner == owner_addr, error::permission_denied(E_NOT_OWNER));
        assert!(vector::length(&agent.capabilities) < MAX_CAPABILITIES, error::resource_exhausted(E_MAX_AGENTS_REACHED));
        
        let cap_name = get_capability_name(cap_type);
        vector::push_back(&mut agent.capabilities, Capability {
            cap_type,
            name: cap_name,
            enabled: true,
            last_used: 0,
        });
    }

    // ============ Helper Functions ============

    /// Get capability name from type
    fun get_capability_name(cap_type: u8): String {
        if (cap_type == CAP_INFERENCE) {
            string::utf8(b"AI Inference")
        } else if (cap_type == CAP_RWA_SETTLEMENT) {
            string::utf8(b"RWA Settlement")
        } else if (cap_type == CAP_CONTENT_VERIFICATION) {
            string::utf8(b"Content Verification")
        } else if (cap_type == CAP_ROYALTY_PROCESSING) {
            string::utf8(b"Royalty Processing")
        } else if (cap_type == CAP_DATA_ANALYSIS) {
            string::utf8(b"Data Analysis")
        } else if (cap_type == CAP_SWARM_COORDINATION) {
            string::utf8(b"Swarm Coordination")
        } else {
            string::utf8(b"Unknown")
        }
    }

    // ============ View Functions ============

    #[view]
    /// Check if an agent exists
    public fun agent_exists(agent_id: vector<u8>): bool acquires AgentStorage {
        let storage = borrow_global<AgentStorage>(@verifiai);
        table::contains(&storage.agents, agent_id)
    }

    #[view]
    /// Check if an agent is active
    public fun is_agent_active(agent_id: vector<u8>): bool acquires AgentStorage {
        let storage = borrow_global<AgentStorage>(@verifiai);
        if (!table::contains(&storage.agents, agent_id)) {
            return false
        };
        let agent = table::borrow(&storage.agents, agent_id);
        agent.is_active
    }

    #[view]
    /// Get agent owner
    public fun get_agent_owner(agent_id: vector<u8>): address acquires AgentStorage {
        let storage = borrow_global<AgentStorage>(@verifiai);
        assert!(table::contains(&storage.agents, agent_id), error::not_found(E_AGENT_NOT_FOUND));
        let agent = table::borrow(&storage.agents, agent_id);
        agent.owner
    }

    #[view]
    /// Get agent reputation
    public fun get_agent_reputation(agent_id: vector<u8>): u64 acquires AgentStorage {
        let storage = borrow_global<AgentStorage>(@verifiai);
        assert!(table::contains(&storage.agents, agent_id), error::not_found(E_AGENT_NOT_FOUND));
        let agent = table::borrow(&storage.agents, agent_id);
        agent.reputation
    }

    #[view]
    /// Get agent verified action count
    public fun get_verified_actions(agent_id: vector<u8>): u64 acquires AgentStorage {
        let storage = borrow_global<AgentStorage>(@verifiai);
        assert!(table::contains(&storage.agents, agent_id), error::not_found(E_AGENT_NOT_FOUND));
        let agent = table::borrow(&storage.agents, agent_id);
        agent.verified_actions
    }

    #[view]
    /// Get registry statistics
    public fun get_registry_stats(): (u64, u64, u64) acquires Registry {
        let registry = borrow_global<Registry>(@verifiai);
        (registry.total_agents, registry.active_agents, registry.registration_fee)
    }

    // ============ Test Helpers ============

    #[test_only]
    public fun init_for_test(admin: &signer) {
        initialize(admin);
    }
}
