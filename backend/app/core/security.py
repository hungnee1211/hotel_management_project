from hashlib import sha256
from secrets import token_urlsafe
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)

def digest(token: str) -> str:
    return sha256(token.encode()).hexdigest()

def new_token() -> str:
    return token_urlsafe(48)
