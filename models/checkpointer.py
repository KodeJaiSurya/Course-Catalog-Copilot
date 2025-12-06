from sqlalchemy import Column, String, Integer, Text, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from db.database import Base


class Checkpoint(Base):
    __tablename__ = "checkpoints"
    thread_id = Column(String, primary_key=True)
    checkpoint_ns = Column(String, primary_key=True, default='')
    checkpoint_id = Column(String, primary_key=True)
    parent_checkpoint_id = Column(String, nullable=True)
    type = Column(String, nullable=True)
    checkpoint = Column(JSON, nullable=False)
    meta_data = Column(JSON, default={})


class CheckpointWrite(Base):
    __tablename__ = "checkpoint_writes"
    thread_id = Column(String, primary_key=True)
    checkpoint_ns = Column(String, primary_key=True, default='')
    checkpoint_id = Column(String, primary_key=True)
    task_id = Column(String, primary_key=True)
    idx = Column(Integer, primary_key=True)
    channel = Column(String, nullable=False)
    type = Column(String, nullable=True)
    value = Column(JSON, nullable=True)