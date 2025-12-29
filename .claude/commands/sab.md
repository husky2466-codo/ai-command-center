# Multi-Agent Execution Command

Execute the refined prompt using multiple specialized agents working in parallel.

## Input
The user wants to execute: $ARGUMENTS

## Execution Strategy

1. **Analyze** the task and break it down into parallelizable components

2. **Identify** which specialized agents are needed:
   - **Research Agent** - For gathering information, exploring codebases, web searches
   - **Planning Agent** - For architectural decisions and implementation strategies
   - **Code Agent** - For writing, editing, and refactoring code
   - **Review Agent** - For code review, testing, and quality assurance
   - **Documentation Agent** - For writing docs, comments, and explanations

3. **Launch agents in parallel** using the Task tool:
   - Spawn multiple agents simultaneously for independent tasks
   - Coordinate dependent tasks sequentially
   - Each agent should have a clear, specific objective

4. **Coordinate** the results:
   - Collect outputs from all agents
   - Resolve any conflicts or inconsistencies
   - Merge results into a cohesive deliverable

5. **Report** back to the user:
   - Summary of what each agent accomplished
   - Final integrated result
   - Any issues or recommendations

## Execution Rules

- Maximize parallelization - launch independent agents together
- Be specific in agent prompts - each agent needs clear instructions
- Use appropriate agent types for each subtask
- Monitor progress and handle failures gracefully
- Synthesize all outputs into a unified response

## Begin Execution

Analyze the task now and spawn the appropriate agents to complete it efficiently.
