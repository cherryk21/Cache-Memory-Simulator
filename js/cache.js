
/* =====================================
   CACHELAB - CACHE SIMULATION ENGINE
===================================== */

/*
   Common cache line structure:

   valid = 0 means empty
   valid = 1 means occupied
   tag   = identifies the memory block
   block = memory block number
*/

function createCache(cacheLines) {
    return Array.from({ length: cacheLines }, () => ({
        valid: 0,
        tag: "-",
        block: "-"
    }));
}

function saveCacheState(cache) {
    return cache.map(line => ({ ...line }));
}

function createResult(steps, hits, misses, extra = {}) {

    const total = hits + misses;

    return {
        steps,
        hits,
        misses,
        total,
        hitRatio: total ? hits / total * 100 : 0,
        missRatio: total ? misses / total * 100 : 0,
        ...extra
    };
}

/* =====================================
   1. DIRECT MAPPING
===================================== */

function simulateDirectMapping(cacheLines, blockSize, addresses) {

    const cache = createCache(cacheLines);

    const steps = [];

    let hits = 0;
    let misses = 0;

    addresses.forEach((address, index) => {

        // Convert address into memory block
        const block = Math.floor(address / blockSize);

        // Direct mapping formulas
        const lineIndex = block % cacheLines;
        const tag = Math.floor(block / cacheLines);

        const currentLine = cache[lineIndex];

        let status;

        if (
            currentLine.valid === 1 &&
            currentLine.tag === tag
        ) {

            status = "HIT";
            hits++;

        } else {

            status = "MISS";
            misses++;

            // Replace the existing block if necessary
            cache[lineIndex] = {
                valid: 1,
                tag: tag,
                block: block
            };
        }

        steps.push({
            accessNumber: index + 1,
            address,
            block,
            line: lineIndex,
            set: null,
            tag,
            status,
            cacheState: saveCacheState(cache)
        });

    });

    return createResult(steps, hits, misses, {
        mappingName: "Direct Mapping"
    });
}

/* =====================================
   2. FULLY ASSOCIATIVE MAPPING
===================================== */

function simulateFullyAssociative(cacheLines, blockSize, addresses) {

    const cache = createCache(cacheLines);

    // FIFO queue stores cache line indexes
    const fifoQueue = [];

    const steps = [];

    let hits = 0;
    let misses = 0;

    addresses.forEach((address, index) => {

        const block = Math.floor(address / blockSize);

        // Search the entire cache
        const existingLine = cache.findIndex(line =>
            line.valid === 1 &&
            line.tag === block
        );

        let status;
        let lineIndex;

        if (existingLine !== -1) {

            status = "HIT";
            hits++;

            lineIndex = existingLine;

        } else {

            status = "MISS";
            misses++;

            // Find an empty cache line
            const emptyLine = cache.findIndex(
                line => line.valid === 0
            );

            if (emptyLine !== -1) {

                lineIndex = emptyLine;

            } else {

                // FIFO replacement
                lineIndex = fifoQueue.shift();
            }

            // Insert the new block
            cache[lineIndex] = {
                valid: 1,
                tag: block,
                block: block
            };

            // Record insertion order
            fifoQueue.push(lineIndex);
        }

        steps.push({
            accessNumber: index + 1,
            address,
            block,
            line: lineIndex,
            set: null,
            tag: block,
            status,
            cacheState: saveCacheState(cache)
        });

    });

    return createResult(steps, hits, misses, {
        mappingName: "Fully Associative Mapping"
    });
}

/* =====================================
   3. SET ASSOCIATIVE MAPPING
===================================== */

function simulateSetAssociative(
    cacheLines,
    blockSize,
    addresses,
    associativity
) {

    if (
        !Number.isInteger(associativity) ||
        associativity < 1 ||
        associativity > cacheLines ||
        cacheLines % associativity !== 0
    ) {
        throw new Error(
            "Associativity must divide the number of cache lines exactly."
        );
    }

    // Calculate number of sets
    const numberOfSets = cacheLines / associativity;

    const cache = createCache(cacheLines);

    // Each set has its own FIFO queue
    const fifoQueues = Array.from(
        { length: numberOfSets },
        () => []
    );

    const steps = [];

    let hits = 0;
    let misses = 0;

    addresses.forEach((address, index) => {

        const block = Math.floor(address / blockSize);

        // Calculate set index and tag
        const setIndex = block % numberOfSets;

        const tag = Math.floor(block / numberOfSets);

        // Find the first line of the selected set
        const startLine = setIndex * associativity;

        let existingLine = -1;

        // Search only within the selected set
        for (let way = 0; way < associativity; way++) {

            const lineIndex = startLine + way;

            if (
                cache[lineIndex].valid === 1 &&
                cache[lineIndex].tag === tag
            ) {
                existingLine = lineIndex;
                break;
            }
        }

        let status;
        let lineIndex;

        if (existingLine !== -1) {

            status = "HIT";
            hits++;

            lineIndex = existingLine;

        } else {

            status = "MISS";
            misses++;

            // Find an empty line within the selected set
            let emptyLine = -1;

            for (let way = 0; way < associativity; way++) {

                const candidate = startLine + way;

                if (cache[candidate].valid === 0) {
                    emptyLine = candidate;
                    break;
                }
            }

            if (emptyLine !== -1) {

                lineIndex = emptyLine;

            } else {

                // FIFO replacement within this set
                lineIndex = fifoQueues[setIndex].shift();
            }

            // Insert new block
            cache[lineIndex] = {
                valid: 1,
                tag: tag,
                block: block
            };

            fifoQueues[setIndex].push(lineIndex);
        }

        steps.push({
            accessNumber: index + 1,
            address,
            block,
            line: lineIndex,
            set: setIndex,
            tag,
            status,
            cacheState: saveCacheState(cache)
        });

    });

    return createResult(steps, hits, misses, {
        mappingName: "Set Associative Mapping",
        numberOfSets,
        associativity
    });
}
