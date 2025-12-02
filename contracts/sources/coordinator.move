/// @title VerifiAI Multi-Agent Coordinator
/// @notice Coordination layer for agent swarms with shared memory
/// @dev Enables multi-agent collaboration via Shelby blob-anchored state
module verifiai::coordinator {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use verifiai::events;
    use verifiai::registry;

    // ============ Error Codes ============
    
    /// Swarm already exists
    const E_SWARM_EXISTS: u64 = 1;
    /// Swarm not found
    const E_SWARM_NOT_FOUND: u64 = 2;
    /// Not swarm creator
    const E_NOT_CREATOR: u64 = 3;
    /// Agent not member of swarm
    const E_NOT_MEMBER: u64 = 4;
    /// Agent already member
    const E_ALREADY_MEMBER: u64 = 5;
    /// Swarm is full
    const E_SWARM_FULL: u64 = 6;
    /// Swarm is inactive
    const E_SWARM_INACTIVE: u64 = 7;
    /// Invalid task
    const E_INVALID_TASK: u64 = 8;
    /// Task not found
    const E_TASK_NOT_FOUND: u64 = 9;

    // ============ Constants ============
    
    /// Maximum members per swarm
    const MAX_SWARM_MEMBERS: u64 = 50;
    /// Maximum active tasks per swarm
    const MAX_ACTIVE_TASKS: u64 = 100;

    // Task status
    const TASK_PENDING: u8 = 0;
    const TASK_IN_PROGRESS: u8 = 1;
    const TASK_COMPLETED: u8 = 2;
    const TASK_FAILED: u8 = 3;

    // ============ Structs ============

    /// Swarm member entry
    struct SwarmMember has store, copy, drop {
        /// Agent ID
        agent_id: vector<u8>,
        /// Role in swarm (e.g., "leader", "worker", "validator")
        role: String,
        /// Join timestamp
        joined_at: u64,
        /// Contribution score
        contribution: u64,
    }

    /// Shared memory state reference
    struct SharedMemoryState has store, copy, drop {
        /// Shelby blob URI for current state
        blob_uri: String,
        /// State hash for verification
        state_hash: vector<u8>,
        /// Last update timestamp
        updated_at: u64,
        /// Agent that made last update
        updated_by: vector<u8>,
        /// Version number
        version: u64,
    }

    /// Task definition for swarm coordination
    struct Task has store, copy, drop {
        /// Unique task ID
        id: vector<u8>,
        /// Task description
        description: String,
        /// Assigned agent ID (empty if unassigned)
        assigned_to: vector<u8>,
        /// Task status
        status: u8,
        /// Required proof ID
        proof_id: vector<u8>,
        /// Task result hash
        result_hash: vector<u8>,
        /// Creation timestamp
        created_at: u64,
        /// Completion timestamp
        completed_at: u64,
    }

    /// Agent swarm definition
    struct Swarm has store {
        /// Unique swarm identifier
        id: vector<u8>,
        /// Creator/owner address
        creator: address,
        /// Swarm name
        name: String,
        /// Swarm description
        description: String,
        /// Member list
        members: vector<SwarmMember>,
        /// Shared memory state
        shared_memory: SharedMemoryState,
        /// Active tasks
        tasks: vector<Task>,
        /// Total completed tasks
        completed_tasks: u64,
        /// Creation timestamp
        created_at: u64,
        /// Whether swarm is active
        is_active: bool,
    }

    /// Global coordinator state
    struct Coordinator has key {
        /// Admin address
        admin: address,
        /// Total swarms created
        total_swarms: u64,
        /// Active swarms
        active_swarms: u64,
    }

    /// Swarm storage
    struct SwarmStorage has key {
        /// Map from swarm_id to Swarm
        swarms: Table<vector<u8>, Swarm>,
        /// Map from creator to their swarm IDs
        creator_swarms: Table<address, vector<vector<u8>>>,
        /// Map from agent_id to swarms they're in
        agent_swarms: Table<vector<u8>, vector<vector<u8>>>,
    }

    // ============ Initialization ============

    /// Initialize the coordinator module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, Coordinator {
            admin: admin_addr,
            total_swarms: 0,
            active_swarms: 0,
        });
        
        move_to(admin, SwarmStorage {
            swarms: table::new(),
            creator_swarms: table::new(),
            agent_swarms: table::new(),
        });
    }

    // ============ Swarm Management ============

    /// Create a new agent swarm
    public entry fun create_swarm(
        creator: &signer,
        swarm_id: vector<u8>,
        name: String,
        description: String,
        initial_memory_uri: String,
        leader_agent_id: vector<u8>
    ) acquires Coordinator, SwarmStorage {
        let creator_addr = signer::address_of(creator);
        let storage = borrow_global_mut<SwarmStorage>(@verifiai);
        
        // Ensure swarm doesn't exist
        assert!(!table::contains(&storage.swarms, swarm_id), error::already_exists(E_SWARM_EXISTS));
        
        // Verify leader agent exists and is owned by creator
        assert!(registry::agent_exists(leader_agent_id), error::not_found(E_NOT_MEMBER));
        
        let now = timestamp::now_microseconds();
        
        // Create initial member (leader)
        let leader = SwarmMember {
            agent_id: leader_agent_id,
            role: string::utf8(b"leader"),
            joined_at: now,
            contribution: 0,
        };
        
        let members = vector::empty<SwarmMember>();
        vector::push_back(&mut members, leader);
        
        // Initialize shared memory state
        let shared_memory = SharedMemoryState {
            blob_uri: initial_memory_uri,
            state_hash: vector::empty(),
            updated_at: now,
            updated_by: leader_agent_id,
            version: 1,
        };
        
        // Create swarm
        let swarm = Swarm {
            id: swarm_id,
            creator: creator_addr,
            name,
            description,
            members,
            shared_memory,
            tasks: vector::empty(),
            completed_tasks: 0,
            created_at: now,
            is_active: true,
        };
        
        // Store swarm
        table::add(&mut storage.swarms, swarm_id, swarm);
        
        // Track by creator
        if (!table::contains(&storage.creator_swarms, creator_addr)) {
            table::add(&mut storage.creator_swarms, creator_addr, vector::empty());
        };
        let creator_swarms = table::borrow_mut(&mut storage.creator_swarms, creator_addr);
        vector::push_back(creator_swarms, swarm_id);
        
        // Track agent membership
        if (!table::contains(&storage.agent_swarms, leader_agent_id)) {
            table::add(&mut storage.agent_swarms, leader_agent_id, vector::empty());
        };
        let agent_swarm_list = table::borrow_mut(&mut storage.agent_swarms, leader_agent_id);
        vector::push_back(agent_swarm_list, swarm_id);
        
        // Update coordinator stats
        let coordinator = borrow_global_mut<Coordinator>(@verifiai);
        coordinator.total_swarms = coordinator.total_swarms + 1;
        coordinator.active_swarms = coordinator.active_swarms + 1;
        
        // Emit event
        events::emit_swarm_created(
            swarm_id,
            creator_addr,
            1, // Initial member count
            initial_memory_uri
        );
    }

    /// Add an agent to a swarm
    public entry fun join_swarm(
        owner: &signer,
        swarm_id: vector<u8>,
        agent_id: vector<u8>,
        role: String
    ) acquires SwarmStorage {
        let owner_addr = signer::address_of(owner);
        let storage = borrow_global_mut<SwarmStorage>(@verifiai);
        
        assert!(table::contains(&storage.swarms, swarm_id), error::not_found(E_SWARM_NOT_FOUND));
        
        let swarm = table::borrow_mut(&mut storage.swarms, swarm_id);
        assert!(swarm.is_active, error::unavailable(E_SWARM_INACTIVE));
        assert!(vector::length(&swarm.members) < MAX_SWARM_MEMBERS, error::resource_exhausted(E_SWARM_FULL));
        
        // Verify agent ownership
        assert!(registry::get_agent_owner(agent_id) == owner_addr, error::permission_denied(E_NOT_CREATOR));
        
        // Check not already member
        let i = 0;
        let len = vector::length(&swarm.members);
        while (i < len) {
            let member = vector::borrow(&swarm.members, i);
            assert!(member.agent_id != agent_id, error::already_exists(E_ALREADY_MEMBER));
            i = i + 1;
        };
        
        let now = timestamp::now_microseconds();
        
        // Add member
        vector::push_back(&mut swarm.members, SwarmMember {
            agent_id,
            role,
            joined_at: now,
            contribution: 0,
        });
        
        // Track agent membership
        if (!table::contains(&storage.agent_swarms, agent_id)) {
            table::add(&mut storage.agent_swarms, agent_id, vector::empty());
        };
        let agent_swarm_list = table::borrow_mut(&mut storage.agent_swarms, agent_id);
        vector::push_back(agent_swarm_list, swarm_id);
        
        // Emit event
        events::emit_agent_joined_swarm(swarm_id, agent_id, now);
    }

    /// Update shared memory state
    public entry fun update_shared_memory(
        owner: &signer,
        swarm_id: vector<u8>,
        agent_id: vector<u8>,
        new_blob_uri: String,
        new_state_hash: vector<u8>
    ) acquires SwarmStorage {
        let owner_addr = signer::address_of(owner);
        let storage = borrow_global_mut<SwarmStorage>(@verifiai);
        
        assert!(table::contains(&storage.swarms, swarm_id), error::not_found(E_SWARM_NOT_FOUND));
        
        let swarm = table::borrow_mut(&mut storage.swarms, swarm_id);
        assert!(swarm.is_active, error::unavailable(E_SWARM_INACTIVE));
        
        // Verify agent is member and owner
        assert!(registry::get_agent_owner(agent_id) == owner_addr, error::permission_denied(E_NOT_CREATOR));
        
        let is_member = false;
        let i = 0;
        let len = vector::length(&swarm.members);
        while (i < len) {
            let member = vector::borrow(&swarm.members, i);
            if (member.agent_id == agent_id) {
                is_member = true;
                break
            };
            i = i + 1;
        };
        assert!(is_member, error::permission_denied(E_NOT_MEMBER));
        
        let now = timestamp::now_microseconds();
        
        // Update shared memory
        swarm.shared_memory.blob_uri = new_blob_uri;
        swarm.shared_memory.state_hash = new_state_hash;
        swarm.shared_memory.updated_at = now;
        swarm.shared_memory.updated_by = agent_id;
        swarm.shared_memory.version = swarm.shared_memory.version + 1;
        
        // Emit event
        events::emit_shared_memory_updated(swarm_id, agent_id, new_state_hash, now);
    }

    // ============ Task Management ============

    /// Create a new task for the swarm
    public entry fun create_task(
        creator: &signer,
        swarm_id: vector<u8>,
        task_id: vector<u8>,
        description: String
    ) acquires SwarmStorage {
        let creator_addr = signer::address_of(creator);
        let storage = borrow_global_mut<SwarmStorage>(@verifiai);
        
        assert!(table::contains(&storage.swarms, swarm_id), error::not_found(E_SWARM_NOT_FOUND));
        
        let swarm = table::borrow_mut(&mut storage.swarms, swarm_id);
        assert!(swarm.creator == creator_addr, error::permission_denied(E_NOT_CREATOR));
        assert!(swarm.is_active, error::unavailable(E_SWARM_INACTIVE));
        assert!(vector::length(&swarm.tasks) < MAX_ACTIVE_TASKS, error::resource_exhausted(E_SWARM_FULL));
        
        let now = timestamp::now_microseconds();
        
        vector::push_back(&mut swarm.tasks, Task {
            id: task_id,
            description,
            assigned_to: vector::empty(),
            status: TASK_PENDING,
            proof_id: vector::empty(),
            result_hash: vector::empty(),
            created_at: now,
            completed_at: 0,
        });
    }

    /// Assign a task to an agent
    public entry fun assign_task(
        creator: &signer,
        swarm_id: vector<u8>,
        task_id: vector<u8>,
        agent_id: vector<u8>
    ) acquires SwarmStorage {
        let creator_addr = signer::address_of(creator);
        let storage = borrow_global_mut<SwarmStorage>(@verifiai);
        
        assert!(table::contains(&storage.swarms, swarm_id), error::not_found(E_SWARM_NOT_FOUND));
        
        let swarm = table::borrow_mut(&mut storage.swarms, swarm_id);
        assert!(swarm.creator == creator_addr, error::permission_denied(E_NOT_CREATOR));
        
        // Find and update task
        let i = 0;
        let len = vector::length(&swarm.tasks);
        let found = false;
        while (i < len) {
            let task = vector::borrow_mut(&mut swarm.tasks, i);
            if (task.id == task_id) {
                task.assigned_to = agent_id;
                task.status = TASK_IN_PROGRESS;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, error::not_found(E_TASK_NOT_FOUND));
    }

    /// Complete a task with verified proof
    public entry fun complete_task(
        owner: &signer,
        swarm_id: vector<u8>,
        task_id: vector<u8>,
        agent_id: vector<u8>,
        proof_id: vector<u8>,
        result_hash: vector<u8>
    ) acquires SwarmStorage {
        let owner_addr = signer::address_of(owner);
        let storage = borrow_global_mut<SwarmStorage>(@verifiai);
        
        assert!(table::contains(&storage.swarms, swarm_id), error::not_found(E_SWARM_NOT_FOUND));
        
        let swarm = table::borrow_mut(&mut storage.swarms, swarm_id);
        
        // Verify agent ownership
        assert!(registry::get_agent_owner(agent_id) == owner_addr, error::permission_denied(E_NOT_CREATOR));
        
        let now = timestamp::now_microseconds();
        
        // Find and update task
        let i = 0;
        let len = vector::length(&swarm.tasks);
        let found = false;
        while (i < len) {
            let task = vector::borrow_mut(&mut swarm.tasks, i);
            if (task.id == task_id && task.assigned_to == agent_id) {
                task.status = TASK_COMPLETED;
                task.proof_id = proof_id;
                task.result_hash = result_hash;
                task.completed_at = now;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, error::not_found(E_TASK_NOT_FOUND));
        
        swarm.completed_tasks = swarm.completed_tasks + 1;
        
        // Update member contribution
        let j = 0;
        let members_len = vector::length(&swarm.members);
        while (j < members_len) {
            let member = vector::borrow_mut(&mut swarm.members, j);
            if (member.agent_id == agent_id) {
                member.contribution = member.contribution + 1;
                break
            };
            j = j + 1;
        };
    }

    /// Deactivate a swarm
    public entry fun deactivate_swarm(
        creator: &signer,
        swarm_id: vector<u8>
    ) acquires Coordinator, SwarmStorage {
        let creator_addr = signer::address_of(creator);
        let storage = borrow_global_mut<SwarmStorage>(@verifiai);
        
        assert!(table::contains(&storage.swarms, swarm_id), error::not_found(E_SWARM_NOT_FOUND));
        
        let swarm = table::borrow_mut(&mut storage.swarms, swarm_id);
        assert!(swarm.creator == creator_addr, error::permission_denied(E_NOT_CREATOR));
        
        swarm.is_active = false;
        
        let coordinator = borrow_global_mut<Coordinator>(@verifiai);
        if (coordinator.active_swarms > 0) {
            coordinator.active_swarms = coordinator.active_swarms - 1;
        };
    }

    // ============ View Functions ============

    #[view]
    /// Check if a swarm exists
    public fun swarm_exists(swarm_id: vector<u8>): bool acquires SwarmStorage {
        let storage = borrow_global<SwarmStorage>(@verifiai);
        table::contains(&storage.swarms, swarm_id)
    }

    #[view]
    /// Check if a swarm is active
    public fun is_swarm_active(swarm_id: vector<u8>): bool acquires SwarmStorage {
        let storage = borrow_global<SwarmStorage>(@verifiai);
        if (!table::contains(&storage.swarms, swarm_id)) {
            return false
        };
        let swarm = table::borrow(&storage.swarms, swarm_id);
        swarm.is_active
    }

    #[view]
    /// Get swarm member count
    public fun get_member_count(swarm_id: vector<u8>): u64 acquires SwarmStorage {
        let storage = borrow_global<SwarmStorage>(@verifiai);
        assert!(table::contains(&storage.swarms, swarm_id), error::not_found(E_SWARM_NOT_FOUND));
        let swarm = table::borrow(&storage.swarms, swarm_id);
        vector::length(&swarm.members)
    }

    #[view]
    /// Get coordinator statistics
    public fun get_coordinator_stats(): (u64, u64) acquires Coordinator {
        let coordinator = borrow_global<Coordinator>(@verifiai);
        (coordinator.total_swarms, coordinator.active_swarms)
    }

    // ============ Test Helpers ============

    #[test_only]
    public fun init_for_test(admin: &signer) {
        initialize(admin);
    }
}
