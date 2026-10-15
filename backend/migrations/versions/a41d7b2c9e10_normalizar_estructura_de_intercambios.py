"""Normaliza conversaciones, publicaciones, transacciones y moderación

Revision ID: a41d7b2c9e10
Revises: 5dae7c62797c
Create Date: 2026-10-07

"""
from alembic import op
import sqlalchemy as sa


revision = "a41d7b2c9e10"
down_revision = "5dae7c62797c"
branch_labels = None
depends_on = None


def upgrade():
    # RF09: una conversación es una entidad propia y los mensajes pueden
    # pertenecer a ella. conversation_id queda nullable durante la transición
    # para no romper mensajes existentes.
    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user1_id", sa.Integer(), nullable=False),
        sa.Column("user2_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user1_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user2_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user1_id", "user2_id", name="uq_conversation_users"),
    )

    op.add_column("messages", sa.Column("conversation_id", sa.Integer(), nullable=True))
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"], unique=False)
    op.create_foreign_key(
        "fk_messages_conversation", "messages", "conversations",
        ["conversation_id"], ["id"], ondelete="CASCADE",
    )

    # La revisión anterior creó estas dos tablas. Adaptamos sus columnas en
    # lugar de volver a crearlas, evitando el error "table already exists".
    op.alter_column(
        "exchange_images", "filename",
        existing_type=sa.String(length=255),
        type_=sa.String(length=255), nullable=False, new_column_name="image_url",
    )
    op.create_unique_constraint(
        "uq_exchange_image_position", "exchange_images", ["exchange_id", "position"]
    )
    op.alter_column(
        "exchange_images", "created_at",
        existing_type=sa.DateTime(), nullable=True,
    )

    # Normaliza transactions al modelo actual conservando las filas existentes.
    op.execute("UPDATE transactions SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")
    op.alter_column(
        "transactions", "created_at",
        existing_type=sa.DateTime(), nullable=False, new_column_name="started_at",
    )
    op.add_column(
        "transactions",
        sa.Column("cancellation_reason", sa.String(length=255), nullable=True),
    )

    # RF10: la valoración puede quedar asociada al intercambio real.
    op.add_column("reviews", sa.Column("transaction_id", sa.Integer(), nullable=True))
    op.create_index("ix_reviews_transaction_id", "reviews", ["transaction_id"], unique=False)
    op.create_foreign_key(
        "fk_reviews_transaction", "reviews", "transactions",
        ["transaction_id"], ["id"], ondelete="SET NULL",
    )

    # RF05/RF13: conservar cada acción administrativa por separado.
    op.create_table(
        "moderation_actions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # RF09: asociar el silencio a la conversación normalizada.
    op.add_column(
        "muted_conversations", sa.Column("conversation_id", sa.Integer(), nullable=True)
    )
    op.create_index(
        "ix_muted_conversations_conversation_id",
        "muted_conversations", ["conversation_id"], unique=False,
    )
    op.create_foreign_key(
        "fk_muted_conversations_conversation", "muted_conversations", "conversations",
        ["conversation_id"], ["id"], ondelete="CASCADE",
    )

    # RF11: tipar notificaciones y permitir referencia a la entidad origen.
    op.add_column(
        "notifications", sa.Column("notification_type", sa.String(length=50), nullable=True)
    )
    op.add_column(
        "notifications", sa.Column("reference_id", sa.Integer(), nullable=True)
    )


def downgrade():
    op.drop_column("notifications", "reference_id")
    op.drop_column("notifications", "notification_type")

    op.drop_constraint(
        "fk_muted_conversations_conversation", "muted_conversations", type_="foreignkey"
    )
    op.drop_index(
        "ix_muted_conversations_conversation_id", table_name="muted_conversations"
    )
    op.drop_column("muted_conversations", "conversation_id")

    op.drop_table("moderation_actions")

    op.drop_constraint("fk_reviews_transaction", "reviews", type_="foreignkey")
    op.drop_index("ix_reviews_transaction_id", table_name="reviews")
    op.drop_column("reviews", "transaction_id")

    op.drop_column("transactions", "cancellation_reason")
    op.alter_column(
        "transactions", "started_at",
        existing_type=sa.DateTime(), nullable=True, new_column_name="created_at",
    )

    op.drop_constraint("uq_exchange_image_position", "exchange_images", type_="unique")
    op.alter_column(
        "exchange_images", "image_url",
        existing_type=sa.String(length=255), type_=sa.String(length=255),
        nullable=False, new_column_name="filename",
    )

    op.drop_constraint(
        "fk_messages_conversation", "messages", type_="foreignkey"
    )
    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_column("messages", "conversation_id")
    op.drop_table("conversations")
