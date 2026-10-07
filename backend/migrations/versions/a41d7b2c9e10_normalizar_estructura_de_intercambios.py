"""Normaliza conversaciones, publicaciones, transacciones y moderación

Revision ID: a41d7b2c9e10
Revises: 977a053f5a01
Create Date: 2026-10-07

"""
from alembic import op
import sqlalchemy as sa


revision = "a41d7b2c9e10"
down_revision = "977a053f5a01"
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

    op.add_column(
        "messages",
        sa.Column("conversation_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_messages_conversation_id",
        "messages",
        ["conversation_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_messages_conversation",
        "messages",
        "conversations",
        ["conversation_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # RF04: una publicación puede tener varias fotografías ordenadas.
    op.create_table(
        "exchange_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exchange_id", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=255), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["exchange_id"], ["exchanges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exchange_id", "position", name="uq_exchange_image_position"),
    )

    # RF12: separa la publicación del intercambio real. Una solicitud
    # aceptada origina como máximo una transacción.
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exchange_id", sa.Integer(), nullable=False),
        sa.Column("exchange_request_id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("requester_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("En proceso", "Completado", "Cancelado", name="transactionstatus"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("cancellation_reason", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["exchange_id"], ["exchanges.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["exchange_request_id"],
            ["exchange_requests.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requester_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exchange_request_id"),
    )

    # RF10: la valoración puede quedar asociada al intercambio real.
    # Nullable para conservar reseñas históricas ya existentes.
    op.add_column(
        "reviews",
        sa.Column("transaction_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_reviews_transaction_id",
        "reviews",
        ["transaction_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_reviews_transaction",
        "reviews",
        "transactions",
        ["transaction_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # RF05/RF13: conservar cada acción administrativa por separado, en vez
    # de sobrescribir únicamente reports.admin_action.
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

    # RF09: asociar el silencio a la conversación normalizada sin eliminar
    # todavía user_id/other_user_id, que mantiene compatibilidad con las rutas.
    op.add_column(
        "muted_conversations",
        sa.Column("conversation_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_muted_conversations_conversation_id",
        "muted_conversations",
        ["conversation_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_muted_conversations_conversation",
        "muted_conversations",
        "conversations",
        ["conversation_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # RF11: tipar las notificaciones y permitir que apunten a la entidad
    # que las originó (publicación, intercambio, mensaje, reseña, etc.).
    op.add_column(
        "notifications",
        sa.Column("notification_type", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "notifications",
        sa.Column("reference_id", sa.Integer(), nullable=True),
    )


def downgrade():
    op.drop_column("notifications", "reference_id")
    op.drop_column("notifications", "notification_type")

    op.drop_constraint(
        "fk_muted_conversations_conversation",
        "muted_conversations",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_muted_conversations_conversation_id",
        table_name="muted_conversations",
    )
    op.drop_column("muted_conversations", "conversation_id")

    op.drop_table("moderation_actions")

    op.drop_constraint(
        "fk_reviews_transaction",
        "reviews",
        type_="foreignkey",
    )
    op.drop_index("ix_reviews_transaction_id", table_name="reviews")
    op.drop_column("reviews", "transaction_id")

    op.drop_table("transactions")

    op.drop_table("exchange_images")

    op.drop_constraint(
        "fk_messages_conversation",
        "messages",
        type_="foreignkey",
    )
    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_column("messages", "conversation_id")

    op.drop_table("conversations")
