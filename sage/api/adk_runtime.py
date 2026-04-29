from functools import lru_cache


@lru_cache(maxsize=1)
def get_adk_components():
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types as genai_types

    return Runner, InMemorySessionService, genai_types


@lru_cache(maxsize=1)
def get_session_service():
    _, InMemorySessionService, _ = get_adk_components()
    return InMemorySessionService()
