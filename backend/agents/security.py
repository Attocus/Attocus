import re
from typing import Optional

# Comprehensive SQL Injection detection patterns
SQL_INJECTION_PATTERNS = [
    r"(?i)\b(SELECT\s+.+\s+FROM)\b",
    r"(?i)\b(INSERT\s+INTO\s+.+\s+VALUES)\b",
    r"(?i)\b(UPDATE\s+.+\s+SET)\b",
    r"(?i)\b(DELETE\s+FROM)\b",
    r"(?i)\b(DROP\s+TABLE|DROP\s+DATABASE|DROP\s+VIEW|DROP\s+SCHEMA)\b",
    r"(?i)\b(ALTER\s+TABLE)\b",
    r"(?i)\b(UNION\s+(ALL\s+)?SELECT)\b",
    r"(?i)\b(OR|AND)\s+['\"]?1['\"]?\s*=\s*['\"]?1",
    r"(?i)\b(OR|AND)\s+TRUE\b",
    r"(?i)\bINFORMATION_SCHEMA\b",
    r"(?i)\bXP_CMDSHELL\b",
    r"(?i)\bEXEC(\s+XP_|\s+SP_)\b",
    r"(?i);\s*(DROP|DELETE|UPDATE|INSERT|SELECT)\b",
    r"(?i)--\s*$",
    r"(?i)/\*.*?\*/",
    r"(?i)\bWAITFOR\s+DELAY\b",
    r"(?i)\bBENCHMARK\s*\(",
    r"(?i)\bSLEEP\s*\(",
]

def check_sql_injection(text: Optional[str]) -> bool:
    """
    Returns True if any SQL Injection signature is detected in the input text.
    """
    if not text or not isinstance(text, str):
        return False
    
    clean_text = text.strip()
    if not clean_text:
        return False

    for pattern in SQL_INJECTION_PATTERNS:
        if re.search(pattern, clean_text):
            return True
            
    return False

def get_safe_rejection_response(language: str = "ar") -> str:
    """
    Returns a natural, polite educational refusal that does NOT expose
    technical security warnings or 'SQL Injection' keywords to the user.
    """
    if language == "ar":
        return "أعتذر منك، لم أتمكن من فهم هذا السؤال أو صياغته غير متوافقة مع محتوى وسلايدات المحاضرة. يرجى التكرم بطرح سؤال أكاديمي متعلق بالمادة وسأكون سعيداً بمساعدتك!"
    return "I apologize, but I couldn't understand this input or it is outside the scope of the lecture slides. Please ask an academic question related to the lecture, and I'll be glad to help!"
