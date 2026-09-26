import re
from typing import Optional, Any, Dict, List

# -------------------------------------------------------------
# 1. SQL Injection Protection Patterns
# -------------------------------------------------------------
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

# -------------------------------------------------------------
# 2. Prompt Injection & Jailbreak Patterns
# -------------------------------------------------------------
PROMPT_INJECTION_PATTERNS = [
    # English jailbreak & override signatures
    r"(?i)\b(ignore|forget|disregard|override|bypass)\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts|rules|commands)\b",
    r"(?i)\b(act\s+as\s+(dan|developer\s+mode|unfiltered|jailbroken|an\s+ai\s+without\s+rules))\b",
    r"(?i)\b(reveal|print|display|dump|show|output)\s+(your\s+)?(initial|system|hidden)\s+(prompt|instructions|directive)\b",
    r"(?i)\b(you\s+are\s+no\s+longer\s+an\s+ai|stop\s+being\s+a\s+tutor|break\s+free\s+from\s+rules)\b",
    r"(?i)\b(sudo\s+mode|root\s+access|jailbreak\s+active)\b",
    # Arabic jailbreak & override signatures
    r"(انس[ىي]?|تجاهل|تخطى|احذف|اترك)\s+(جميع\s+|كل\s+)?(الـ?|ال)?(تعليمات|توجيهات|اوامر|أوامر|قواعد)(ك|ها)?(\s+(السابقة|الاولى|الأولى|المسبقة))?",
    r"(انس[ىي]?|تجاهل)\s+انك\s+(معلم|وكيل|ذكاء\s+اصطناعي|بوت)",
    r"(اظهر|اعطني|اطبع|اكشف|انسخ)\s+(.*?\s+)?(الـ?|ال)?(برومبت|الاوامر\s+السرية|التعليمات\s+المخفية|توجيهات\s+النظام|السيستم\s+برومبت|prompt)",
    r"(تصرف\s+كـ?|تقمص\s+دور)\s+(مخترق|قرصان|شخص\s+بلا\s+قيود|دان|dan)",
    r"(تجاوز\s+القيود|كسر\s+الحماية|تخطي\s+الفلتر)",
    r"(انس[ىي]?\s+.*?\s+واكتب\s+لي\s+كود)",

]

# -------------------------------------------------------------
# 3. Student Emotional Distress & Frustration Patterns
# -------------------------------------------------------------
STUDENT_DISTRESS_PATTERNS = [
    # Arabic distress & burnout phrases
    r"(انا|أنا)?\s*(مكتئب|مكتئبة|محبط|محبطة|يائس|يائسة|تعبت\s+وخلاص|كرهت\s+(الدراسة|المذاكرة|نفسي))",
    r"(تعبت\s+جدا|بفشل\s+في\s+كل\s+شي|مافي\s+فايدة|ما\s+في\s+فايدة|ما\s+عندي\s+طاقة|مو\s+قادر\s+اتحمل|عقلي\s+مقفل)",
    r"(مضغوط\s+حد\s+الانفجار|ابغى\s+ابكي|حاس\s+بالعجز|مو\s+فاهم\s+شي\s+وبستسلم|بستسلم\s+خلاص)",
    # English distress phrases
    r"(?i)\b(i\s+want\s+to\s+give\s+up|i\s+can'?t\s+take\s+this\s+anymore|i\s+feel\s+hopeless|i\s+hate\s+myself)\b",
    r"(?i)\b(i\s+am\s+so\s+depressed|i\s+am\s+failing\s+everything|too\s+much\s+stress|breakdown\s+imminent)\b",
    r"(?i)\b(completely\s+burnt\s+out|overwhelmed\s+and\s+exhausted)\b",
]

# -------------------------------------------------------------
# 4. Off-Topic Non-Academic Keywords (Topic Boundary Checker)
# -------------------------------------------------------------
OFF_TOPIC_PATTERNS = [
    # Cooking / Food recipes
    r"(?i)\b(طريقة\s+عمل|وصفة|طبخة|طبخ|كبسة|شاورما|بيتزا|recipe|cook|baking|burger)\b",
    # Sports / Football clubs & matches
    r"(?i)\b(مباراة\s+اليوم|دوري\s+ابطال|ريال\s+مدريد|برشلونة|الهلال|النصر|الاتحاد|football\s+score|premier\s+league)\b",
    # Movies, Celebrity gossip & Video games
    r"(?i)\b(افلام|مسلسلات|فيلم\s+سهرة|فورتنايت|ببجي|بلايستيشن|gta\s+v|minecraft|celebrity\s+gossip)\b",
    # Crypto / Trading / Investment schemes
    r"(?i)\b(تداول|عملات\s+رقمية|بيتكوين|crypto\s+trading|bitcoin\s+investment)\b",
]


def check_sql_injection(text: Optional[str]) -> bool:
    """Returns True if any SQL Injection signature is detected in the input text."""
    if not text or not isinstance(text, str):
        return False
    clean_text = text.strip()
    if not clean_text:
        return False
    for pattern in SQL_INJECTION_PATTERNS:
        if re.search(pattern, clean_text):
            return True
    return False


def normalize_text_for_security(text: str) -> str:
    """Removes Arabic tashkeel, tatweel, and standardizes characters to prevent diacritic bypass."""
    t = re.sub(r"[\u0640\u064B-\u065F\u0670]", "", text)
    t = re.sub(r"[إأآا]", "ا", t)
    return t


def check_prompt_injection(text: Optional[str]) -> bool:
    """
    Returns True if user input attempts Prompt Injection, Jailbreak,
    or instruction override.
    """
    if not text or not isinstance(text, str):
        return False
    clean_text = text.strip()
    if not clean_text:
        return False
    normalized = normalize_text_for_security(clean_text)
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, clean_text) or re.search(pattern, normalized):
            return True
    return False



def check_student_distress(text: Optional[str]) -> bool:
    """
    Returns True if user text expresses severe emotional distress,
    hopelessness, or intense study burnout.
    """
    if not text or not isinstance(text, str):
        return False
    clean_text = text.strip()
    if not clean_text:
        return False
    normalized = normalize_text_for_security(clean_text)
    for pattern in STUDENT_DISTRESS_PATTERNS:
        if re.search(pattern, clean_text) or re.search(pattern, normalized):
            return True
    return False


def check_topic_boundary(text: Optional[str]) -> bool:
    """
    Returns True if the student query is explicitly outside the academic/study boundary
    (cooking, sports, entertainment, gaming, trading).
    """
    if not text or not isinstance(text, str):
        return False
    clean_text = text.strip()
    if not clean_text:
        return False
    normalized = normalize_text_for_security(clean_text)
    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, clean_text) or re.search(pattern, normalized):
            return True
    return False



def get_safe_rejection_response(language: str = "ar") -> str:
    """Returns a natural educational refusal that does not expose security internals."""
    if language == "ar":
        return "أعتذر منك، لم أتمكن من فهم هذا السؤال أو صياغته غير متوافقة مع محتوى وسلايدات المحاضرة. يرجى التكرم بطرح سؤال أكاديمي متعلق بالمادة وسأكون سعيداً بمساعدتك!"
    return "I apologize, but I couldn't process this input as it does not align with the academic scope of the lecture. Please ask a study-related question, and I will be happy to help!"


def get_prompt_injection_rejection(language: str = "ar") -> str:
    """Rejection specifically for prompt injection or jailbreak attempts."""
    if language == "ar":
        return "أنا هنا بصفتي معلماً أكاديمياً خاصاً لمساعدتك في فهم مقرر هذه المحاضرة. لا يمكنني تجاوز أدواري التعليمية، ويسعدني جداً أن نركز على السلايدات والمفاهيم الدراسية!"
    return "I am specifically designed as your academic tutor for this lecture. I cannot alter my educational role, but I'd be delighted to help you explore any concept in the course material!"


def get_distress_intervention_response(language: str = "ar") -> str:
    """Warm, supportive intervention advising an extended break upon severe distress."""
    if language == "ar":
        return (
            "💙 أشعر بمدى الجهد والضغط الذي تمرين به، والتعلم أحياناً يكون مرهقاً ومحبطاً، وهذا شعور طبيعي جداً.\n\n"
            "صحتك وراحتك النفسية هي الأهم دائماً وأبداً. ما رأيك أن نأخذ استراحة ممتدة الآن؟ "
            "تنفسي بعمق، ابتعدي عن الشاشة قليلاً، اشربي ماء، ودعي عقلك يرتاح. "
            "ستكونين قادرة على الفهم والإنجاز بشكل رائع حين تعودين بنشاطك، وأنا سأكون هنا بانتظارك لدعمك خطوة بخطوة!"
        )
    return (
        "💙 I hear how stressful and overwhelming this feels right now, and it is completely normal to feel fatigued.\n\n"
        "Your mental well-being and health always come first. How about we pause and take an extended break right now? "
        "Take a few deep breaths, step away from the screen, and hydrate. "
        "You have got this, and when you are feeling refreshed, I'll be right here to support you step by step!"
    )


def get_topic_boundary_rejection(topic: Optional[str] = None, language: str = "ar") -> str:
    """Rejection guiding student back to lecture content when deviating to non-academic subjects."""
    subj = topic or "المحاضرة الحالية"
    if language == "ar":
        return f"أنا هنا لمساعدتك في فهم مادة [{subj}]، دعنا نركز على السلايدات الحالية والمفاهيم الأكاديمية ونحقق أقصى استفادة من وقتك!"
    subj_en = topic or "this lecture"
    return f"I am here to help you master [{subj_en}]. Let's stay focused on the current lecture slides to make the best use of your study time!"


# -------------------------------------------------------------
# 5. Zero Data Leakage Telemetry Validator
# -------------------------------------------------------------
def validate_zero_data_leakage(payload: Any) -> bool:
    """
    Strictly verifies that no raw image arrays, Base64 pixel buffers,
    or image payloads exist in telemetry/tracking data.
    Returns True if clean, False if raw visual data is leaked.
    """
    if isinstance(payload, dict):
        for k, v in payload.items():
            key_lower = str(k).lower()
            if any(forbidden in key_lower for forbidden in ["image", "frame", "pixel", "b64", "base64", "snapshot"]):
                if isinstance(v, (str, bytes, list)) and len(v) > 100:
                    return False
            if not validate_zero_data_leakage(v):
                return False
    elif isinstance(payload, list):
        for item in payload:
            if not validate_zero_data_leakage(item):
                return False
    elif isinstance(payload, str):
        # Detect base64 data URLs or raw base64 jpeg/png headers
        if "data:image/" in payload:
            return False
        if len(payload) > 500 and (payload.startswith("/9j/") or payload.startswith("iVBORw0KGgo")):
            return False
    return True
