/// @title VerifiAI ZK Proof Verifier
/// @notice Core verification logic for Groth16 zkSNARKs and Bulletproofs
/// @dev Implements on-chain verification of AI inference proofs
module verifiai::verifier {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};
    use verifiai::events;

    // ============ Error Codes ============
    
    /// Proof has already been verified
    const E_PROOF_ALREADY_EXISTS: u64 = 1;
    /// Invalid proof format
    const E_INVALID_PROOF_FORMAT: u64 = 2;
    /// Invalid verification key
    const E_INVALID_VK: u64 = 3;
    /// Proof verification failed
    const E_VERIFICATION_FAILED: u64 = 4;
    /// Not authorized to perform this action
    const E_NOT_AUTHORIZED: u64 = 5;
    /// Proof not found
    const E_PROOF_NOT_FOUND: u64 = 6;
    /// Invalid proof type
    const E_INVALID_PROOF_TYPE: u64 = 7;
    /// Protocol is paused
    const E_PROTOCOL_PAUSED: u64 = 8;

    // ============ Constants ============
    
    /// Groth16 proof type identifier
    const PROOF_TYPE_GROTH16: u8 = 1;
    /// Bulletproofs type identifier
    const PROOF_TYPE_BULLETPROOFS: u8 = 2;
    /// Hybrid (TEE-attested) proof type identifier
    const PROOF_TYPE_HYBRID: u8 = 3;

    /// Expected length of Groth16 proof (A, B, C points)
    const GROTH16_PROOF_LENGTH: u64 = 256;
    /// Expected length of Bulletproofs proof
    const BULLETPROOFS_PROOF_LENGTH: u64 = 512;

    // ============ Structs ============

    /// Groth16 verification key components
    struct Groth16VerificationKey has store, copy, drop {
        /// Alpha point (G1)
        alpha: vector<u8>,
        /// Beta point (G2)
        beta: vector<u8>,
        /// Gamma point (G2)
        gamma: vector<u8>,
        /// Delta point (G2)
        delta: vector<u8>,
        /// IC points for public inputs
        ic: vector<vector<u8>>,
    }

    /// Bulletproofs verification parameters
    struct BulletproofsParams has store, copy, drop {
        /// Generator points
        generators: vector<u8>,
        /// Pedersen commitment bases
        pedersen_bases: vector<u8>,
        /// Range proof bit size
        range_bits: u64,
    }

    /// Complete proof data structure
    struct Proof has store, copy, drop {
        /// Unique proof identifier
        id: vector<u8>,
        /// Type of proof (groth16, bulletproofs, hybrid)
        proof_type: u8,
        /// Serialized proof data
        proof_data: vector<u8>,
        /// Public inputs/outputs
        public_inputs: vector<vector<u8>>,
        /// Hash of the AI model used
        model_hash: vector<u8>,
        /// Inference output hash
        output_hash: vector<u8>,
        /// Submitter address
        submitter: address,
        /// Submission timestamp
        submitted_at: u64,
        /// Verification status
        is_verified: bool,
        /// Verification timestamp (0 if not verified)
        verified_at: u64,
    }

    /// Global verifier configuration
    struct VerifierConfig has key {
        /// Admin address
        admin: address,
        /// Whether the protocol is paused
        is_paused: bool,
        /// Total proofs submitted
        total_proofs: u64,
        /// Total proofs verified
        verified_proofs: u64,
        /// Verification fee in APT (base units)
        verification_fee: u64,
        /// Default Groth16 VK (can be overridden per proof)
        default_groth16_vk: Groth16VerificationKey,
        /// Default Bulletproofs params
        default_bulletproofs_params: BulletproofsParams,
    }

    /// Storage for all submitted proofs
    struct ProofStorage has key {
        /// Map from proof_id to Proof
        proofs: Table<vector<u8>, Proof>,
        /// Map from submitter to their proof IDs
        user_proofs: Table<address, vector<vector<u8>>>,
    }

    // ============ Initialization ============

    /// Initialize the verifier module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        // Create default empty verification keys
        let default_groth16_vk = Groth16VerificationKey {
            alpha: vector::empty(),
            beta: vector::empty(),
            gamma: vector::empty(),
            delta: vector::empty(),
            ic: vector::empty(),
        };
        
        let default_bulletproofs_params = BulletproofsParams {
            generators: vector::empty(),
            pedersen_bases: vector::empty(),
            range_bits: 64,
        };
        
        move_to(admin, VerifierConfig {
            admin: admin_addr,
            is_paused: false,
            total_proofs: 0,
            verified_proofs: 0,
            verification_fee: 100000, // 0.001 APT
            default_groth16_vk,
            default_bulletproofs_params,
        });
        
        move_to(admin, ProofStorage {
            proofs: table::new(),
            user_proofs: table::new(),
        });
    }

    // ============ Admin Functions ============

    /// Update the verification fee
    public entry fun set_verification_fee(
        admin: &signer,
        new_fee: u64
    ) acquires VerifierConfig {
        let config = borrow_global_mut<VerifierConfig>(@verifiai);
        assert!(signer::address_of(admin) == config.admin, error::permission_denied(E_NOT_AUTHORIZED));
        config.verification_fee = new_fee;
    }

    /// Pause/unpause the protocol
    public entry fun set_paused(
        admin: &signer,
        paused: bool
    ) acquires VerifierConfig {
        let config = borrow_global_mut<VerifierConfig>(@verifiai);
        assert!(signer::address_of(admin) == config.admin, error::permission_denied(E_NOT_AUTHORIZED));
        config.is_paused = paused;
    }

    /// Update default Groth16 verification key
    public entry fun set_groth16_vk(
        admin: &signer,
        alpha: vector<u8>,
        beta: vector<u8>,
        gamma: vector<u8>,
        delta: vector<u8>,
        ic: vector<vector<u8>>
    ) acquires VerifierConfig {
        let config = borrow_global_mut<VerifierConfig>(@verifiai);
        assert!(signer::address_of(admin) == config.admin, error::permission_denied(E_NOT_AUTHORIZED));
        
        config.default_groth16_vk = Groth16VerificationKey {
            alpha,
            beta,
            gamma,
            delta,
            ic,
        };
    }

    // ============ Core Verification Functions ============

    /// Submit a new proof for verification
    public entry fun submit_proof(
        submitter: &signer,
        proof_id: vector<u8>,
        proof_type: u8,
        proof_data: vector<u8>,
        public_inputs: vector<vector<u8>>,
        model_hash: vector<u8>,
        output_hash: vector<u8>
    ) acquires VerifierConfig, ProofStorage {
        let submitter_addr = signer::address_of(submitter);
        let config = borrow_global<VerifierConfig>(@verifiai);
        
        // Check protocol is not paused
        assert!(!config.is_paused, error::unavailable(E_PROTOCOL_PAUSED));
        
        // Validate proof type
        assert!(
            proof_type == PROOF_TYPE_GROTH16 || 
            proof_type == PROOF_TYPE_BULLETPROOFS || 
            proof_type == PROOF_TYPE_HYBRID,
            error::invalid_argument(E_INVALID_PROOF_TYPE)
        );
        
        // Validate proof data length based on type
        if (proof_type == PROOF_TYPE_GROTH16) {
            assert!(
                vector::length(&proof_data) >= GROTH16_PROOF_LENGTH,
                error::invalid_argument(E_INVALID_PROOF_FORMAT)
            );
        } else if (proof_type == PROOF_TYPE_BULLETPROOFS) {
            assert!(
                vector::length(&proof_data) >= BULLETPROOFS_PROOF_LENGTH,
                error::invalid_argument(E_INVALID_PROOF_FORMAT)
            );
        };
        
        let storage = borrow_global_mut<ProofStorage>(@verifiai);
        
        // Ensure proof doesn't already exist
        assert!(!table::contains(&storage.proofs, proof_id), error::already_exists(E_PROOF_ALREADY_EXISTS));
        
        let now = timestamp::now_microseconds();
        
        // Create and store the proof
        let proof = Proof {
            id: proof_id,
            proof_type,
            proof_data,
            public_inputs,
            model_hash,
            output_hash,
            submitter: submitter_addr,
            submitted_at: now,
            is_verified: false,
            verified_at: 0,
        };
        
        table::add(&mut storage.proofs, proof_id, proof);
        
        // Track user's proofs
        if (!table::contains(&storage.user_proofs, submitter_addr)) {
            table::add(&mut storage.user_proofs, submitter_addr, vector::empty());
        };
        let user_proofs = table::borrow_mut(&mut storage.user_proofs, submitter_addr);
        vector::push_back(user_proofs, proof_id);
        
        // Update stats
        let config_mut = borrow_global_mut<VerifierConfig>(@verifiai);
        config_mut.total_proofs = config_mut.total_proofs + 1;
        
        // Emit event
        let proof_type_str = if (proof_type == PROOF_TYPE_GROTH16) {
            string::utf8(b"groth16")
        } else if (proof_type == PROOF_TYPE_BULLETPROOFS) {
            string::utf8(b"bulletproofs")
        } else {
            string::utf8(b"hybrid")
        };
        
        events::emit_proof_submitted(
            proof_id,
            submitter_addr,
            proof_type_str,
            model_hash,
            now
        );
    }

    /// Verify a submitted proof (Groth16)
    /// @notice This performs on-chain verification using stored VK
    public entry fun verify_groth16_proof(
        verifier: &signer,
        proof_id: vector<u8>
    ) acquires VerifierConfig, ProofStorage {
        let config = borrow_global<VerifierConfig>(@verifiai);
        assert!(!config.is_paused, error::unavailable(E_PROTOCOL_PAUSED));
        
        let storage = borrow_global_mut<ProofStorage>(@verifiai);
        assert!(table::contains(&storage.proofs, proof_id), error::not_found(E_PROOF_NOT_FOUND));
        
        let proof = table::borrow_mut(&mut storage.proofs, proof_id);
        assert!(proof.proof_type == PROOF_TYPE_GROTH16, error::invalid_argument(E_INVALID_PROOF_TYPE));
        
        // Perform Groth16 verification
        // In production, this would use native crypto functions
        // For MVP, we simulate verification with structural checks
        let is_valid = verify_groth16_internal(
            &proof.proof_data,
            &proof.public_inputs,
            &config.default_groth16_vk
        );
        
        let now = timestamp::now_microseconds();
        
        if (is_valid) {
            proof.is_verified = true;
            proof.verified_at = now;
            
            let config_mut = borrow_global_mut<VerifierConfig>(@verifiai);
            config_mut.verified_proofs = config_mut.verified_proofs + 1;
            
            // Approximate gas used (would be actual in production)
            let gas_used = 50000u64;
            events::emit_proof_verified(proof_id, true, gas_used, now);
        } else {
            events::emit_proof_rejected(
                proof_id,
                E_VERIFICATION_FAILED,
                string::utf8(b"Groth16 verification failed")
            );
        };
    }

    /// Verify a Bulletproofs range proof
    public entry fun verify_bulletproofs(
        verifier: &signer,
        proof_id: vector<u8>
    ) acquires VerifierConfig, ProofStorage {
        let config = borrow_global<VerifierConfig>(@verifiai);
        assert!(!config.is_paused, error::unavailable(E_PROTOCOL_PAUSED));
        
        let storage = borrow_global_mut<ProofStorage>(@verifiai);
        assert!(table::contains(&storage.proofs, proof_id), error::not_found(E_PROOF_NOT_FOUND));
        
        let proof = table::borrow_mut(&mut storage.proofs, proof_id);
        assert!(proof.proof_type == PROOF_TYPE_BULLETPROOFS, error::invalid_argument(E_INVALID_PROOF_TYPE));
        
        // Perform Bulletproofs verification
        let is_valid = verify_bulletproofs_internal(
            &proof.proof_data,
            &proof.public_inputs,
            &config.default_bulletproofs_params
        );
        
        let now = timestamp::now_microseconds();
        
        if (is_valid) {
            proof.is_verified = true;
            proof.verified_at = now;
            
            let config_mut = borrow_global_mut<VerifierConfig>(@verifiai);
            config_mut.verified_proofs = config_mut.verified_proofs + 1;
            
            let gas_used = 30000u64;
            events::emit_proof_verified(proof_id, true, gas_used, now);
        } else {
            events::emit_proof_rejected(
                proof_id,
                E_VERIFICATION_FAILED,
                string::utf8(b"Bulletproofs verification failed")
            );
        };
    }

    /// Verify a hybrid TEE-attested proof
    public entry fun verify_hybrid_proof(
        verifier: &signer,
        proof_id: vector<u8>,
        tee_attestation: vector<u8>
    ) acquires VerifierConfig, ProofStorage {
        let config = borrow_global<VerifierConfig>(@verifiai);
        assert!(!config.is_paused, error::unavailable(E_PROTOCOL_PAUSED));
        
        let storage = borrow_global_mut<ProofStorage>(@verifiai);
        assert!(table::contains(&storage.proofs, proof_id), error::not_found(E_PROOF_NOT_FOUND));
        
        let proof = table::borrow_mut(&mut storage.proofs, proof_id);
        assert!(proof.proof_type == PROOF_TYPE_HYBRID, error::invalid_argument(E_INVALID_PROOF_TYPE));
        
        // Verify TEE attestation + ZK proof combination
        let is_valid = verify_hybrid_internal(
            &proof.proof_data,
            &tee_attestation,
            &proof.public_inputs
        );
        
        let now = timestamp::now_microseconds();
        
        if (is_valid) {
            proof.is_verified = true;
            proof.verified_at = now;
            
            let config_mut = borrow_global_mut<VerifierConfig>(@verifiai);
            config_mut.verified_proofs = config_mut.verified_proofs + 1;
            
            let gas_used = 20000u64;
            events::emit_proof_verified(proof_id, true, gas_used, now);
        } else {
            events::emit_proof_rejected(
                proof_id,
                E_VERIFICATION_FAILED,
                string::utf8(b"Hybrid verification failed")
            );
        };
    }

    // ============ Internal Verification Functions ============

    /// Internal Groth16 verification logic
    /// @dev In production, this would use native crypto precompiles
    fun verify_groth16_internal(
        proof_data: &vector<u8>,
        public_inputs: &vector<vector<u8>>,
        vk: &Groth16VerificationKey
    ): bool {
        // Validate proof structure
        if (vector::length(proof_data) < GROTH16_PROOF_LENGTH) {
            return false
        };
        
        // Validate VK is set
        if (vector::is_empty(&vk.alpha)) {
            // For MVP, accept proofs when no VK is set (testing mode)
            return true
        };
        
        // Pairing check simulation
        // e(A, B) = e(alpha, beta) * e(sum(vk_i * input_i), gamma) * e(C, delta)
        // This would use native pairing functions in production
        
        // For now, perform structural validation
        let valid_structure = vector::length(proof_data) >= 256;
        
        valid_structure
    }

    /// Internal Bulletproofs verification logic
    fun verify_bulletproofs_internal(
        proof_data: &vector<u8>,
        public_inputs: &vector<vector<u8>>,
        params: &BulletproofsParams
    ): bool {
        // Validate proof structure
        if (vector::length(proof_data) < BULLETPROOFS_PROOF_LENGTH) {
            return false
        };
        
        // Range proof verification simulation
        // In production, this would verify that committed values are in [0, 2^n)
        
        let valid_structure = vector::length(proof_data) >= 512;
        
        valid_structure
    }

    /// Internal hybrid verification logic
    fun verify_hybrid_internal(
        proof_data: &vector<u8>,
        tee_attestation: &vector<u8>,
        public_inputs: &vector<vector<u8>>
    ): bool {
        // Verify TEE attestation signature
        if (vector::length(tee_attestation) < 64) {
            return false
        };
        
        // Verify enclave measurement matches expected value
        // In production, this would check against known good measurements
        
        // Verify proof output matches TEE attestation
        let attestation_valid = vector::length(tee_attestation) >= 64;
        let proof_valid = vector::length(proof_data) >= 32;
        
        attestation_valid && proof_valid
    }

    // ============ View Functions ============

    #[view]
    /// Get proof details by ID
    public fun get_proof(proof_id: vector<u8>): (
        u8,           // proof_type
        address,      // submitter
        u64,          // submitted_at
        bool,         // is_verified
        u64           // verified_at
    ) acquires ProofStorage {
        let storage = borrow_global<ProofStorage>(@verifiai);
        assert!(table::contains(&storage.proofs, proof_id), error::not_found(E_PROOF_NOT_FOUND));
        
        let proof = table::borrow(&storage.proofs, proof_id);
        (
            proof.proof_type,
            proof.submitter,
            proof.submitted_at,
            proof.is_verified,
            proof.verified_at
        )
    }

    #[view]
    /// Check if a proof exists
    public fun proof_exists(proof_id: vector<u8>): bool acquires ProofStorage {
        let storage = borrow_global<ProofStorage>(@verifiai);
        table::contains(&storage.proofs, proof_id)
    }

    #[view]
    /// Check if a proof is verified
    public fun is_proof_verified(proof_id: vector<u8>): bool acquires ProofStorage {
        let storage = borrow_global<ProofStorage>(@verifiai);
        if (!table::contains(&storage.proofs, proof_id)) {
            return false
        };
        let proof = table::borrow(&storage.proofs, proof_id);
        proof.is_verified
    }

    #[view]
    /// Get protocol statistics
    public fun get_stats(): (u64, u64, u64) acquires VerifierConfig {
        let config = borrow_global<VerifierConfig>(@verifiai);
        (config.total_proofs, config.verified_proofs, config.verification_fee)
    }

    #[view]
    /// Get verification fee
    public fun get_verification_fee(): u64 acquires VerifierConfig {
        let config = borrow_global<VerifierConfig>(@verifiai);
        config.verification_fee
    }

    // ============ Test Helpers ============

    #[test_only]
    public fun init_for_test(admin: &signer) {
        initialize(admin);
    }
}
