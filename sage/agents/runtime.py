from functools import lru_cache


@lru_cache(maxsize=1)
def get_root_agent():
    from sage.agents.orchestrator import root_agent

    return root_agent


def warm_root_agent() -> None:
    get_root_agent()
