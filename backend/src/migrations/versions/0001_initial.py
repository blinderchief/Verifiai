"""Initial migration - Create all tables

Revision ID: 0001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('wallet_address', sa.String(66), nullable=True),
        sa.Column('total_proofs', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_rewards', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reputation_score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('current_streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('longest_streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('settings', postgresql.JSONB(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('wallet_address'),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_username', 'users', ['username'])

    # Create ai_models table
    op.create_table(
        'ai_models',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('version', sa.String(20), nullable=False, server_default='1.0.0'),
        sa.Column('model_type', sa.String(50), nullable=False),
        sa.Column('framework', sa.String(50), nullable=True),
        sa.Column('model_hash', sa.String(66), nullable=True),
        sa.Column('shelby_blob_id', sa.String(255), nullable=True),
        sa.Column('metadata_uri', sa.Text(), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('parameters_count', sa.BigInteger(), nullable=True),
        sa.Column('input_schema', postgresql.JSONB(), nullable=True),
        sa.Column('output_schema', postgresql.JSONB(), nullable=True),
        sa.Column('performance_metrics', postgresql.JSONB(), nullable=True),
        sa.Column('training_config', postgresql.JSONB(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('download_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tags', postgresql.ARRAY(sa.String(50)), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ai_models_owner_id', 'ai_models', ['owner_id'])

    # Create agents table
    op.create_table(
        'agents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('active', 'idle', 'busy', 'offline', 'maintenance', name='agentstatus'), nullable=False),
        sa.Column('capabilities', postgresql.ARRAY(sa.String(50)), nullable=False),
        sa.Column('model_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('model_hash', sa.String(66), nullable=True),
        sa.Column('on_chain_id', sa.String(66), nullable=True),
        sa.Column('registration_tx_hash', sa.String(66), nullable=True),
        sa.Column('metadata_uri', sa.Text(), nullable=True),
        sa.Column('shelby_blob_id', sa.String(255), nullable=True),
        sa.Column('total_tasks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('successful_tasks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_tasks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_proofs', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('verified_proofs', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reputation', sa.Integer(), nullable=False, server_default='500'),
        sa.Column('config', postgresql.JSONB(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['model_id'], ['ai_models.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('on_chain_id'),
    )
    op.create_index('ix_agents_owner_id', 'agents', ['owner_id'])
    op.create_index('ix_agents_status', 'agents', ['status'])

    # Create proofs table
    op.create_table(
        'proofs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('proof_type', sa.Enum('groth16', 'bulletproofs', 'hybrid', 'ezkl', name='prooftype'), nullable=False),
        sa.Column('status', sa.Enum('pending', 'generating', 'submitted', 'verifying', 'verified', 'rejected', 'expired', 'failed', name='proofstatus'), nullable=False),
        sa.Column('proof_data', sa.LargeBinary(), nullable=True),
        sa.Column('public_inputs', postgresql.JSONB(), nullable=True),
        sa.Column('model_hash', sa.String(66), nullable=False),
        sa.Column('model_name', sa.String(255), nullable=True),
        sa.Column('input_hash', sa.String(66), nullable=False),
        sa.Column('output_hash', sa.String(66), nullable=False),
        sa.Column('inference_metadata', postgresql.JSONB(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('verified_at', sa.String(30), nullable=True),
        sa.Column('verification_tx_hash', sa.String(66), nullable=True),
        sa.Column('on_chain_id', sa.String(66), nullable=True),
        sa.Column('shelby_blob_id', sa.String(255), nullable=True),
        sa.Column('generation_time_ms', sa.Integer(), nullable=True),
        sa.Column('verification_time_ms', sa.Integer(), nullable=True),
        sa.Column('proof_size_bytes', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('on_chain_id'),
    )
    op.create_index('ix_proofs_user_id', 'proofs', ['user_id'])
    op.create_index('ix_proofs_status', 'proofs', ['status'])
    op.create_index('ix_proofs_model_hash', 'proofs', ['model_hash'])

    # Create swarms table
    op.create_table(
        'swarms',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('active', 'idle', 'processing', 'paused', 'terminated', name='swarmstatus'), nullable=False),
        sa.Column('coordinator_type', sa.String(50), nullable=False),
        sa.Column('agent_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=False),
        sa.Column('config', postgresql.JSONB(), nullable=True),
        sa.Column('task_queue', postgresql.JSONB(), nullable=True),
        sa.Column('total_tasks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed_tasks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_tasks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_swarms_owner_id', 'swarms', ['owner_id'])
    op.create_index('ix_swarms_status', 'swarms', ['status'])

    # Create settlements table
    op.create_table(
        'settlements',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('draft', 'pending', 'processing', 'ready', 'completed', 'failed', 'cancelled', name='settlementstatus'), nullable=False),
        sa.Column('settlement_type', sa.String(50), nullable=False),
        sa.Column('parties', postgresql.JSONB(), nullable=True),
        sa.Column('proof_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column('terms', postgresql.JSONB(), nullable=True),
        sa.Column('total_value', sa.Numeric(precision=20, scale=8), nullable=True),
        sa.Column('currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('on_chain_id', sa.String(66), nullable=True),
        sa.Column('transaction_hash', sa.String(66), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('on_chain_id'),
    )
    op.create_index('ix_settlements_user_id', 'settlements', ['user_id'])
    op.create_index('ix_settlements_status', 'settlements', ['status'])


def downgrade() -> None:
    op.drop_table('settlements')
    op.drop_table('swarms')
    op.drop_table('proofs')
    op.drop_table('agents')
    op.drop_table('ai_models')
    op.drop_table('users')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS settlementstatus')
    op.execute('DROP TYPE IF EXISTS swarmstatus')
    op.execute('DROP TYPE IF EXISTS proofstatus')
    op.execute('DROP TYPE IF EXISTS prooftype')
    op.execute('DROP TYPE IF EXISTS agentstatus')
