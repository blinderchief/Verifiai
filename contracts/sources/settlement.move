/// @title VerifiAI Settlement Module
/// @notice RWA settlement execution with verified AI decisions
/// @dev Integrates with proof verification for trustless settlements
module verifiai::settlement {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_std::table::{Self, Table};
    use verifiai::events;
    use verifiai::verifier;

    // ============ Error Codes ============
    
    /// Settlement already exists
    const E_SETTLEMENT_EXISTS: u64 = 1;
    /// Settlement not found
    const E_SETTLEMENT_NOT_FOUND: u64 = 2;
    /// Not authorized
    const E_NOT_AUTHORIZED: u64 = 3;
    /// Invalid settlement state
    const E_INVALID_STATE: u64 = 4;
    /// Proof not verified
    const E_PROOF_NOT_VERIFIED: u64 = 5;
    /// Insufficient funds
    const E_INSUFFICIENT_FUNDS: u64 = 6;
    /// Settlement expired
    const E_SETTLEMENT_EXPIRED: u64 = 7;

    // ============ Constants ============
    
    // Settlement states
    const STATE_PENDING: u8 = 0;
    const STATE_PROOF_SUBMITTED: u8 = 1;
    const STATE_VERIFIED: u8 = 2;
    const STATE_EXECUTED: u8 = 3;
    const STATE_DISPUTED: u8 = 4;
    const STATE_CANCELLED: u8 = 5;

    // Asset types
    const ASSET_INVOICE: u8 = 1;
    const ASSET_TRADE_FINANCE: u8 = 2;
    const ASSET_REAL_ESTATE: u8 = 3;
    const ASSET_COMMODITY: u8 = 4;
    const ASSET_ROYALTY: u8 = 5;

    /// Default settlement timeout (7 days in microseconds)
    const DEFAULT_TIMEOUT: u64 = 604800000000;

    // ============ Structs ============

    /// Party in a settlement
    struct SettlementParty has store, copy, drop {
        /// Party address
        addr: address,
        /// Role (buyer/seller/validator)
        role: String,
        /// Has approved the settlement
        approved: bool,
        /// Approval timestamp
        approved_at: u64,
    }

    /// Settlement metadata from AI analysis
    struct AIDecision has store, copy, drop {
        /// Proof ID for the AI decision
        proof_id: vector<u8>,
        /// Decision confidence score (0-1000)
        confidence: u64,
        /// Risk score (0-1000)
        risk_score: u64,
        /// Decision summary hash
        summary_hash: vector<u8>,
        /// Shelby blob URI for full analysis
        analysis_uri: String,
    }

    /// RWA Settlement record
    struct Settlement has store {
        /// Unique settlement ID
        id: vector<u8>,
        /// Asset type
        asset_type: u8,
        /// Asset identifier/reference
        asset_ref: String,
        /// Settlement value in base units
        value: u64,
        /// Parties involved
        parties: vector<SettlementParty>,
        /// AI decision data
        ai_decision: AIDecision,
        /// Current state
        state: u8,
        /// Initiator address
        initiator: address,
        /// Creation timestamp
        created_at: u64,
        /// Expiration timestamp
        expires_at: u64,
        /// Execution timestamp (0 if not executed)
        executed_at: u64,
        /// Dispute reason (if disputed)
        dispute_reason: String,
    }

    /// Global settlement config
    struct SettlementConfig has key {
        /// Admin address
        admin: address,
        /// Minimum confidence for auto-execution
        min_confidence: u64,
        /// Maximum risk for auto-execution
        max_risk: u64,
        /// Settlement fee percentage (basis points)
        fee_bps: u64,
        /// Total settlements
        total_settlements: u64,
        /// Executed settlements
        executed_settlements: u64,
        /// Total value settled
        total_value_settled: u64,
    }

    /// Settlement storage
    struct SettlementStorage has key {
        /// Map from settlement_id to Settlement
        settlements: Table<vector<u8>, Settlement>,
        /// Map from address to their settlement IDs
        user_settlements: Table<address, vector<vector<u8>>>,
        /// Map from asset_ref to settlement IDs
        asset_settlements: Table<String, vector<vector<u8>>>,
    }

    /// Escrow for settlement funds
    struct SettlementEscrow has key {
        /// Escrowed coins by settlement ID
        escrow: Table<vector<u8>, Coin<AptosCoin>>,
    }

    // ============ Initialization ============

    /// Initialize the settlement module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, SettlementConfig {
            admin: admin_addr,
            min_confidence: 700, // 70%
            max_risk: 300, // 30%
            fee_bps: 50, // 0.5%
            total_settlements: 0,
            executed_settlements: 0,
            total_value_settled: 0,
        });
        
        move_to(admin, SettlementStorage {
            settlements: table::new(),
            user_settlements: table::new(),
            asset_settlements: table::new(),
        });
        
        move_to(admin, SettlementEscrow {
            escrow: table::new(),
        });
    }

    // ============ Settlement Functions ============

    /// Initiate a new RWA settlement
    public entry fun initiate_settlement(
        initiator: &signer,
        settlement_id: vector<u8>,
        asset_type: u8,
        asset_ref: String,
        value: u64,
        counterparty: address,
        proof_id: vector<u8>,
        timeout_microseconds: u64
    ) acquires SettlementConfig, SettlementStorage {
        let initiator_addr = signer::address_of(initiator);
        let storage = borrow_global_mut<SettlementStorage>(@verifiai);
        
        // Ensure settlement doesn't exist
        assert!(!table::contains(&storage.settlements, settlement_id), error::already_exists(E_SETTLEMENT_EXISTS));
        
        // Verify proof exists
        assert!(verifier::proof_exists(proof_id), error::not_found(E_PROOF_NOT_VERIFIED));
        
        let now = timestamp::now_microseconds();
        let timeout = if (timeout_microseconds > 0) { timeout_microseconds } else { DEFAULT_TIMEOUT };
        
        // Create parties
        let parties = vector::empty<SettlementParty>();
        vector::push_back(&mut parties, SettlementParty {
            addr: initiator_addr,
            role: string::utf8(b"initiator"),
            approved: true,
            approved_at: now,
        });
        vector::push_back(&mut parties, SettlementParty {
            addr: counterparty,
            role: string::utf8(b"counterparty"),
            approved: false,
            approved_at: 0,
        });
        
        // Create AI decision placeholder (will be updated when proof is verified)
        let ai_decision = AIDecision {
            proof_id,
            confidence: 0,
            risk_score: 0,
            summary_hash: vector::empty(),
            analysis_uri: string::utf8(b""),
        };
        
        // Create settlement
        let settlement = Settlement {
            id: settlement_id,
            asset_type,
            asset_ref,
            value,
            parties,
            ai_decision,
            state: STATE_PROOF_SUBMITTED,
            initiator: initiator_addr,
            created_at: now,
            expires_at: now + timeout,
            executed_at: 0,
            dispute_reason: string::utf8(b""),
        };
        
        // Store settlement
        table::add(&mut storage.settlements, settlement_id, settlement);
        
        // Track by user
        if (!table::contains(&storage.user_settlements, initiator_addr)) {
            table::add(&mut storage.user_settlements, initiator_addr, vector::empty());
        };
        let user_settlements = table::borrow_mut(&mut storage.user_settlements, initiator_addr);
        vector::push_back(user_settlements, settlement_id);
        
        if (!table::contains(&storage.user_settlements, counterparty)) {
            table::add(&mut storage.user_settlements, counterparty, vector::empty());
        };
        let counterparty_settlements = table::borrow_mut(&mut storage.user_settlements, counterparty);
        vector::push_back(counterparty_settlements, settlement_id);
        
        // Track by asset
        if (!table::contains(&storage.asset_settlements, asset_ref)) {
            table::add(&mut storage.asset_settlements, asset_ref, vector::empty());
        };
        let asset_settlement_list = table::borrow_mut(&mut storage.asset_settlements, asset_ref);
        vector::push_back(asset_settlement_list, settlement_id);
        
        // Update stats
        let config = borrow_global_mut<SettlementConfig>(@verifiai);
        config.total_settlements = config.total_settlements + 1;
        
        // Emit event
        let asset_type_str = get_asset_type_name(asset_type);
        events::emit_settlement_initiated(
            settlement_id,
            asset_type_str,
            value,
            proof_id,
            initiator_addr
        );
    }

    /// Approve a settlement (counterparty)
    public entry fun approve_settlement(
        party: &signer,
        settlement_id: vector<u8>
    ) acquires SettlementStorage {
        let party_addr = signer::address_of(party);
        let storage = borrow_global_mut<SettlementStorage>(@verifiai);
        
        assert!(table::contains(&storage.settlements, settlement_id), error::not_found(E_SETTLEMENT_NOT_FOUND));
        
        let settlement = table::borrow_mut(&mut storage.settlements, settlement_id);
        let now = timestamp::now_microseconds();
        
        // Check not expired
        assert!(now < settlement.expires_at, error::unavailable(E_SETTLEMENT_EXPIRED));
        
        // Find and update party
        let found = false;
        let i = 0;
        let len = vector::length(&settlement.parties);
        while (i < len) {
            let p = vector::borrow_mut(&mut settlement.parties, i);
            if (p.addr == party_addr) {
                p.approved = true;
                p.approved_at = now;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, error::permission_denied(E_NOT_AUTHORIZED));
    }

    /// Update AI decision after proof verification
    public entry fun update_ai_decision(
        caller: &signer,
        settlement_id: vector<u8>,
        confidence: u64,
        risk_score: u64,
        summary_hash: vector<u8>,
        analysis_uri: String
    ) acquires SettlementStorage {
        let caller_addr = signer::address_of(caller);
        let storage = borrow_global_mut<SettlementStorage>(@verifiai);
        
        assert!(table::contains(&storage.settlements, settlement_id), error::not_found(E_SETTLEMENT_NOT_FOUND));
        
        let settlement = table::borrow_mut(&mut storage.settlements, settlement_id);
        
        // Only initiator can update
        assert!(settlement.initiator == caller_addr, error::permission_denied(E_NOT_AUTHORIZED));
        
        // Verify proof is verified
        assert!(verifier::is_proof_verified(settlement.ai_decision.proof_id), error::invalid_state(E_PROOF_NOT_VERIFIED));
        
        // Update decision
        settlement.ai_decision.confidence = confidence;
        settlement.ai_decision.risk_score = risk_score;
        settlement.ai_decision.summary_hash = summary_hash;
        settlement.ai_decision.analysis_uri = analysis_uri;
        settlement.state = STATE_VERIFIED;
    }

    /// Execute a verified settlement
    public entry fun execute_settlement(
        caller: &signer,
        settlement_id: vector<u8>
    ) acquires SettlementConfig, SettlementStorage {
        let caller_addr = signer::address_of(caller);
        let storage = borrow_global_mut<SettlementStorage>(@verifiai);
        
        assert!(table::contains(&storage.settlements, settlement_id), error::not_found(E_SETTLEMENT_NOT_FOUND));
        
        let settlement = table::borrow_mut(&mut storage.settlements, settlement_id);
        let now = timestamp::now_microseconds();
        
        // Check not expired
        assert!(now < settlement.expires_at, error::unavailable(E_SETTLEMENT_EXPIRED));
        
        // Check state
        assert!(settlement.state == STATE_VERIFIED, error::invalid_state(E_INVALID_STATE));
        
        // Verify caller is a party
        let is_party = false;
        let i = 0;
        let len = vector::length(&settlement.parties);
        while (i < len) {
            let p = vector::borrow(&settlement.parties, i);
            if (p.addr == caller_addr) {
                is_party = true;
                break
            };
            i = i + 1;
        };
        assert!(is_party, error::permission_denied(E_NOT_AUTHORIZED));
        
        // Check all parties approved
        let all_approved = true;
        i = 0;
        while (i < len) {
            let p = vector::borrow(&settlement.parties, i);
            if (!p.approved) {
                all_approved = false;
                break
            };
            i = i + 1;
        };
        assert!(all_approved, error::invalid_state(E_INVALID_STATE));
        
        // Check proof verification
        assert!(verifier::is_proof_verified(settlement.ai_decision.proof_id), error::invalid_state(E_PROOF_NOT_VERIFIED));
        
        // Check confidence/risk thresholds
        let config = borrow_global<SettlementConfig>(@verifiai);
        assert!(settlement.ai_decision.confidence >= config.min_confidence, error::invalid_state(E_INVALID_STATE));
        assert!(settlement.ai_decision.risk_score <= config.max_risk, error::invalid_state(E_INVALID_STATE));
        
        // Execute settlement
        settlement.state = STATE_EXECUTED;
        settlement.executed_at = now;
        
        // Update stats
        let config_mut = borrow_global_mut<SettlementConfig>(@verifiai);
        config_mut.executed_settlements = config_mut.executed_settlements + 1;
        config_mut.total_value_settled = config_mut.total_value_settled + settlement.value;
        
        // Emit event
        events::emit_settlement_completed(
            settlement_id,
            string::utf8(b"executed"),
            now
        );
    }

    /// Dispute a settlement
    public entry fun dispute_settlement(
        party: &signer,
        settlement_id: vector<u8>,
        reason: String
    ) acquires SettlementStorage {
        let party_addr = signer::address_of(party);
        let storage = borrow_global_mut<SettlementStorage>(@verifiai);
        
        assert!(table::contains(&storage.settlements, settlement_id), error::not_found(E_SETTLEMENT_NOT_FOUND));
        
        let settlement = table::borrow_mut(&mut storage.settlements, settlement_id);
        
        // Verify caller is a party
        let is_party = false;
        let i = 0;
        let len = vector::length(&settlement.parties);
        while (i < len) {
            let p = vector::borrow(&settlement.parties, i);
            if (p.addr == party_addr) {
                is_party = true;
                break
            };
            i = i + 1;
        };
        assert!(is_party, error::permission_denied(E_NOT_AUTHORIZED));
        
        // Can only dispute before execution
        assert!(settlement.state != STATE_EXECUTED && settlement.state != STATE_CANCELLED, 
            error::invalid_state(E_INVALID_STATE));
        
        settlement.state = STATE_DISPUTED;
        settlement.dispute_reason = reason;
        
        let now = timestamp::now_microseconds();
        events::emit_settlement_completed(
            settlement_id,
            string::utf8(b"disputed"),
            now
        );
    }

    /// Cancel a settlement (initiator only, before execution)
    public entry fun cancel_settlement(
        initiator: &signer,
        settlement_id: vector<u8>
    ) acquires SettlementStorage {
        let initiator_addr = signer::address_of(initiator);
        let storage = borrow_global_mut<SettlementStorage>(@verifiai);
        
        assert!(table::contains(&storage.settlements, settlement_id), error::not_found(E_SETTLEMENT_NOT_FOUND));
        
        let settlement = table::borrow_mut(&mut storage.settlements, settlement_id);
        assert!(settlement.initiator == initiator_addr, error::permission_denied(E_NOT_AUTHORIZED));
        assert!(settlement.state != STATE_EXECUTED, error::invalid_state(E_INVALID_STATE));
        
        settlement.state = STATE_CANCELLED;
        
        let now = timestamp::now_microseconds();
        events::emit_settlement_completed(
            settlement_id,
            string::utf8(b"cancelled"),
            now
        );
    }

    // ============ Helper Functions ============

    /// Get asset type name
    fun get_asset_type_name(asset_type: u8): String {
        if (asset_type == ASSET_INVOICE) {
            string::utf8(b"invoice")
        } else if (asset_type == ASSET_TRADE_FINANCE) {
            string::utf8(b"trade_finance")
        } else if (asset_type == ASSET_REAL_ESTATE) {
            string::utf8(b"real_estate")
        } else if (asset_type == ASSET_COMMODITY) {
            string::utf8(b"commodity")
        } else if (asset_type == ASSET_ROYALTY) {
            string::utf8(b"royalty")
        } else {
            string::utf8(b"unknown")
        }
    }

    // ============ View Functions ============

    #[view]
    /// Check if settlement exists
    public fun settlement_exists(settlement_id: vector<u8>): bool acquires SettlementStorage {
        let storage = borrow_global<SettlementStorage>(@verifiai);
        table::contains(&storage.settlements, settlement_id)
    }

    #[view]
    /// Get settlement state
    public fun get_settlement_state(settlement_id: vector<u8>): u8 acquires SettlementStorage {
        let storage = borrow_global<SettlementStorage>(@verifiai);
        assert!(table::contains(&storage.settlements, settlement_id), error::not_found(E_SETTLEMENT_NOT_FOUND));
        let settlement = table::borrow(&storage.settlements, settlement_id);
        settlement.state
    }

    #[view]
    /// Get settlement statistics
    public fun get_settlement_stats(): (u64, u64, u64) acquires SettlementConfig {
        let config = borrow_global<SettlementConfig>(@verifiai);
        (config.total_settlements, config.executed_settlements, config.total_value_settled)
    }

    // ============ Test Helpers ============

    #[test_only]
    public fun init_for_test(admin: &signer) {
        initialize(admin);
    }
}
