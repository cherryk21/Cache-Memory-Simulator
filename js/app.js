
/* =====================================
   CACHELAB - MAIN APPLICATION
===================================== */

let selectedMapping = "direct";
let currentResult = null;
let currentStepIndex = -1;

/* =====================================
   DOM HELPERS
===================================== */

function getElement(id) {
    return document.getElementById(id);
}

function scrollToSection(id) {
    getElement(id).scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function getMappingName(type) {

    const names = {
        direct: "Direct Mapping",
        associative: "Fully Associative Mapping",
        set: "Set Associative Mapping"
    };

    return names[type];
}

/* =====================================
   TECHNIQUE SELECTION
===================================== */

function selectMapping(type) {

    selectedMapping = type;

    document.querySelectorAll(".mapping-card").forEach(card => {

        card.classList.toggle(
            "selected",
            card.dataset.mapping === type
        );

    });

    getElement("selectedInfo").innerHTML =
        `Currently selected: <strong>${getMappingName(type)}</strong>`;

    getElement("associativityGroup").hidden =
        type !== "set";

    getElement("visualTitle").textContent =
        getMappingName(type);

    scrollToSection("configuration");
}

/* =====================================
   INPUT VALIDATION
===================================== */

function getConfiguration() {

    const cacheLines = Number(getElement("cacheLines").value);
    const blockSize = Number(getElement("blockSize").value);

    const hitTime = Number(getElement("hitTime").value);
    const missPenalty = Number(getElement("missPenalty").value);

    const sequenceText = getElement("accessSequence").value.trim();

    const associativity = Number(
        getElement("associativity").value
    );

    if (
        !Number.isInteger(cacheLines) ||
        cacheLines < 1 ||
        cacheLines > 256
    ) {
        throw new Error(
            "Cache lines must be an integer between 1 and 256."
        );
    }

    if (
        !Number.isSafeInteger(blockSize) ||
        blockSize < 1
    ) {
        throw new Error(
            "Block size must be a positive safe integer."
        );
    }

    if (
        !Number.isFinite(hitTime) ||
        hitTime < 0 ||
        !Number.isFinite(missPenalty) ||
        missPenalty < 0
    ) {
        throw new Error(
            "Hit time and miss penalty must be non-negative numbers."
        );
    }

    if (sequenceText.length === 0) {
        throw new Error(
            "Please enter a memory access sequence."
        );
    }

    const parts = sequenceText.split(",");

    if (
        parts.some(value => value.trim() === "")
    ) {
        throw new Error(
            "Please enter valid comma-separated memory addresses."
        );
    }

    const addresses = parts.map(value => Number(value.trim()));

    if (
        addresses.some(value =>
            !Number.isSafeInteger(value) || value < 0
        )
    ) {
        throw new Error(
            "Memory addresses must be non-negative safe integers."
        );
    }

    if (
        selectedMapping === "set" &&
        (
            !Number.isInteger(associativity) ||
            associativity < 1 ||
            associativity > cacheLines ||
            cacheLines % associativity !== 0
        )
    ) {
        throw new Error(
            "Associativity must be between 1 and cache lines and divide cache lines exactly."
        );
    }

    return {
        cacheLines,
        blockSize,
        hitTime,
        missPenalty,
        addresses,
        associativity
    };
}

/* =====================================
   RUN SELECTED ALGORITHM
===================================== */

function executeAlgorithm(type, config) {

    if (type === "direct") {

        return simulateDirectMapping(
            config.cacheLines,
            config.blockSize,
            config.addresses
        );

    }

    if (type === "associative") {

        return simulateFullyAssociative(
            config.cacheLines,
            config.blockSize,
            config.addresses
        );

    }

    if (type === "set") {

        return simulateSetAssociative(
            config.cacheLines,
            config.blockSize,
            config.addresses,
            config.associativity
        );

    }

    throw new Error("Unknown mapping technique.");
}

/* =====================================
   RUN SIMULATION
===================================== */

function runSimulation() {

    try {

        getElement("errorMessage").textContent = "";

        const config = getConfiguration();

        const result = executeAlgorithm(
            selectedMapping,
            config
        );

        result.mappingName = getMappingName(selectedMapping);

        result.hitTime = config.hitTime;
        result.missPenalty = config.missPenalty;

        // AMAT = Hit time + Miss rate * Miss penalty
        result.amat =
            config.hitTime +
            (result.misses / result.total) * config.missPenalty;

        currentResult = result;
        currentStepIndex = result.steps.length > 0 ? 0 : -1;

        updateDashboard(result);
        displayResults(result);
        renderCurrentStep();

        getElement("comparisonResults").innerHTML =
            `<div class="empty-state">Run Compare All Techniques to see a comparison.</div>`;

        scrollToSection("visualization");

    } catch (error) {

        getElement("errorMessage").textContent = error.message;

    }
}

/* =====================================
   DASHBOARD STATISTICS
===================================== */

function updateDashboard(result) {

    getElement("totalAccesses").textContent =
        result.total;

    getElement("totalHits").textContent =
        result.hits;

    getElement("totalMisses").textContent =
        result.misses;

    getElement("hitRatio").textContent =
        result.hitRatio.toFixed(2) + "%";
}

/* =====================================
   PERFORMANCE RESULTS
===================================== */

function displayResults(result) {

    let html = `
        <h3>${result.mappingName} Results</h3>

        <div class="result-summary">

            <div class="result-box">
                <span>Total Accesses</span>
                <h2>${result.total}</h2>
            </div>

            <div class="result-box">
                <span>Cache Hits</span>
                <h2 class="green-text">${result.hits}</h2>
            </div>

            <div class="result-box">
                <span>Cache Misses</span>
                <h2 class="red-text">${result.misses}</h2>
            </div>

            <div class="result-box">
                <span>Hit Ratio</span>
                <h2>${result.hitRatio.toFixed(2)}%</h2>
            </div>

            <div class="result-box">
                <span>Miss Ratio</span>
                <h2>${result.missRatio.toFixed(2)}%</h2>
            </div>

            <div class="result-box">
                <span>Hit Time</span>
                <h2>${result.hitTime} ns</h2>
            </div>

            <div class="result-box">
                <span>Miss Penalty</span>
                <h2>${result.missPenalty} ns</h2>
            </div>

            <div class="result-box">
                <span>AMAT</span>
                <h2>${result.amat.toFixed(2)} ns</h2>
            </div>

        </div>

        <div class="amat-highlight">
            <span>Average Memory Access Time</span>
            <h2>${result.amat.toFixed(2)} ns</h2>
            <p>
                AMAT = Hit Time + (Miss Rate × Miss Penalty)
            </p>
        </div>

        <h3 class="table-title">Memory Access Details</h3>

        <div class="table-container">
        <table class="simulation-table">
            <thead>
                <tr>
                    <th>Step</th>
                    <th>Address</th>
                    <th>Block</th>
                    <th>Cache Line</th>
                    <th>Set</th>
                    <th>Tag</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
    `;

    result.steps.forEach(step => {

        html += `
            <tr>
                <td>${step.accessNumber}</td>
                <td>${step.address}</td>
                <td>${step.block}</td>
                <td>${step.line}</td>
                <td>${step.set === null ? "-" : step.set}</td>
                <td>${step.tag}</td>
                <td class="${step.status === "HIT" ? "status-hit" : "status-miss"}">
                    ${step.status}
                </td>
            </tr>
        `;

    });

    html += `
            </tbody>
        </table>
        </div>

        <h3 class="table-title">Final Cache Contents</h3>

        <div class="table-container">
        <table class="simulation-table">
            <thead>
                <tr>
                    <th>Cache Line</th>
                    <th>Valid Bit</th>
                    <th>Tag</th>
                    <th>Memory Block</th>
                </tr>
            </thead>
            <tbody>
    `;

    const finalCache = result.steps.length
        ? result.steps[result.steps.length - 1].cacheState
        : [];

    finalCache.forEach((line, index) => {

        html += `
            <tr>
                <td>${index}</td>
                <td>${line.valid}</td>
                <td>${line.tag}</td>
                <td>${line.block}</td>
            </tr>
        `;

    });

    html += `
            </tbody>
        </table>
        </div>
    `;

    getElement("results").innerHTML = html;
}

/* =====================================
   STEP-BY-STEP CACHE VISUALIZATION
===================================== */

function renderCurrentStep() {

    if (!currentResult || currentStepIndex < 0) {
        return;
    }

    const step = currentResult.steps[currentStepIndex];

    getElement("visualTitle").textContent =
        currentResult.mappingName;

    getElement("stepDescription").textContent =
        `Address ${step.address} | Block ${step.block} | Cache Line ${step.line} | ${step.status}`;

    getElement("stepBadge").textContent =
        `Step ${currentStepIndex + 1} / ${currentResult.total}`;

    getElement("previousButton").disabled =
        currentStepIndex === 0;

    getElement("nextButton").disabled =
        currentStepIndex === currentResult.steps.length - 1;

    let html = "";

    step.cacheState.forEach((line, index) => {

        let className = "cache-line";

        if (index === step.line) {
            className += step.status === "HIT"
                ? " current-hit"
                : " current-miss";
        }

        html += `
            <div class="${className}">

                <h4>Cache Line ${index}</h4>

                <p>Valid Bit:
                    <strong>${line.valid}</strong>
                </p>

                <p>Tag:
                    <strong>${line.tag}</strong>
                </p>

                <p>Memory Block:
                    <strong>${line.block}</strong>
                </p>

            </div>
        `;

    });

    getElement("cacheVisualization").innerHTML = html;
}

/* =====================================
   PREVIOUS AND NEXT BUTTONS
===================================== */

function previousStep() {

    if (
        currentResult &&
        currentStepIndex > 0
    ) {

        currentStepIndex--;
        renderCurrentStep();

    }
}

function nextStep() {

    if (
        currentResult &&
        currentStepIndex < currentResult.steps.length - 1
    ) {

        currentStepIndex++;
        renderCurrentStep();

    }
}

/* =====================================
   COMPARE ALL TECHNIQUES
===================================== */

function compareAllTechniques() {

    try {

        getElement("errorMessage").textContent = "";

        const config = getConfiguration();

        const types = [
            "direct",
            "associative",
            "set"
        ];

        const results = types.map(type => {

            const result = executeAlgorithm(type, config);

            result.mappingName = getMappingName(type);

            result.amat =
                config.hitTime +
                (result.misses / result.total) * config.missPenalty;

            return result;

        });

        let html = "";

        results.forEach(result => {

            html += `
                <div class="comparison-card">

                    <h3>${result.mappingName}</h3>

                    <p>
                        Cache Hits:
                        <strong>${result.hits}</strong>
                    </p>

                    <p>
                        Cache Misses:
                        <strong>${result.misses}</strong>
                    </p>

                    <p>
                        Hit Ratio:
                        <strong>${result.hitRatio.toFixed(2)}%</strong>
                    </p>

                    <div class="bar-track">
                        <div class="bar-fill"
                             style="width:${result.hitRatio}%">
                        </div>
                    </div>

                    <p>
                        Miss Ratio:
                        <strong>${result.missRatio.toFixed(2)}%</strong>
                    </p>

                    <p>
                        AMAT:
                        <strong>${result.amat.toFixed(2)} ns</strong>
                    </p>

                </div>
            `;

        });

        getElement("comparisonResults").innerHTML = html;

        scrollToSection("comparison");

    } catch (error) {

        getElement("errorMessage").textContent =
            error.message;

    }
}

/* =====================================
   RESET SIMULATION
===================================== */

function resetSimulation() {

    currentResult = null;
    currentStepIndex = -1;

    getElement("totalAccesses").textContent = "0";
    getElement("totalHits").textContent = "0";
    getElement("totalMisses").textContent = "0";
    getElement("hitRatio").textContent = "0%";

    getElement("results").innerHTML = `
        <div class="empty-state">
            Run a simulation to see performance results.
        </div>
    `;

    getElement("cacheVisualization").innerHTML = `
        <div class="empty-state">
            Cache visualization will appear here.
        </div>
    `;

    getElement("stepBadge").textContent = "No steps";

    getElement("stepDescription").textContent =
        "Run a simulation to view cache contents.";

    getElement("previousButton").disabled = true;
    getElement("nextButton").disabled = true;

    getElement("comparisonResults").innerHTML = `
        <div class="empty-state">
            Click Compare All Techniques to view the comparison.
        </div>
    `;

    getElement("errorMessage").textContent = "";

}

/* =====================================
   EVENT LISTENERS
===================================== */

document.querySelectorAll(".mapping-card").forEach(card => {

    card.addEventListener("click", () => {

        selectMapping(card.dataset.mapping);

    });

});

getElement("startButton").addEventListener("click", () => {
    scrollToSection("mapping");
});

getElement("runButton").addEventListener("click", runSimulation);

getElement("compareButton").addEventListener(
    "click",
    compareAllTechniques
);

getElement("resetButton").addEventListener(
    "click",
    resetSimulation
);

getElement("previousButton").addEventListener(
    "click",
    previousStep
);

getElement("nextButton").addEventListener(
    "click",
    nextStep
);

/* =====================================
   INITIALIZE APPLICATION
===================================== */

selectMapping("direct");
