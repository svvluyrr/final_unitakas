from pydantic import BaseModel, Field
from typing import Optional

class ListingCreate(BaseModel):
    title: str
    description: str
    category: str
    listing_type: str
    price: str
    image_url: Optional[str] = None
    owner_id: int

class Listing(ListingCreate):
    id: int
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=6, max_length=72)
    name: str = ""

class UserResponse(BaseModel):
    id: int
    email: str
    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    owner_id: int
    listing_id: int