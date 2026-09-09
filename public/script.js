// =========================
// DATE
// =========================

const currentDate = document.getElementById("currentDate");

function getOrdinal(day) {
    if (day > 3 && day < 21) {
        return "th";
    }

    switch (day % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}

function getDateKey(date = new Date()) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}

function formatCurrentDate() {

    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleDateString("en-US", {
        month: "long"
    });

    currentDate.textContent =
        `${day}${getOrdinal(day)} ${month} ${today.getFullYear()}`;

}

formatCurrentDate();


// =========================
// TASK STORAGE
// =========================
//
// This small storage layer keeps persistence separate from rendering.
// The `days` object can later be replaced by an account-backed API.

const TaskStorage = (() => {

    const STORAGE_KEY = "notyourToDo.taskHistory.v1";

    function createEmptyStore() {

        return {
            version: 1,
            days: {}
        };

    }

    function readStore() {

        try {

            const savedValue = localStorage.getItem(STORAGE_KEY);

            if (!savedValue) {
                return createEmptyStore();
            }

            const parsedValue = JSON.parse(savedValue);

            if (
                !parsedValue ||
                typeof parsedValue !== "object" ||
                !parsedValue.days ||
                typeof parsedValue.days !== "object"
            ) {
                return createEmptyStore();
            }

            return parsedValue;

        } catch (error) {

            console.warn("Couldn't read saved tasks.", error);
            return createEmptyStore();

        }

    }

    function writeStore(store) {

        try {

            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
            return true;

        } catch (error) {

            console.warn("Couldn't save tasks.", error);
            return false;

        }

    }

    function copyDay(day) {

        if (!day || !Array.isArray(day.tasks)) {
            return null;
        }

        return {
            createdAt: day.createdAt,
            tasks: day.tasks.map((task) => ({ ...task }))
        };

    }

    function createTask(title) {

        return {
            id: window.crypto && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title,
            completed: false
        };

    }

    return {

        getDay(dateKey) {

            const store = readStore();
            return copyDay(store.days[dateKey]);

        },

        getAllDays() {

            const store = readStore();

            return Object.fromEntries(
                Object.entries(store.days)
                    .map(([dateKey, day]) => [dateKey, copyDay(day)])
                    .filter(([, day]) => day)
            );

        },

        saveGeneratedTasks(dateKey, titles) {

            const store = readStore();

            store.days[dateKey] = {
                createdAt: new Date().toISOString(),
                tasks: titles.map(createTask)
            };

            writeStore(store);

            return copyDay(store.days[dateKey]);

        },

        setTaskCompleted(dateKey, taskId, completed) {

            const store = readStore();
            const day = store.days[dateKey];

            if (!day || !Array.isArray(day.tasks)) {
                return;
            }

            const task = day.tasks.find((item) => item.id === taskId);

            if (!task) {
                return;
            }

            task.completed = completed;
            writeStore(store);

        }

    };

})();


// =========================
// RANDOM MOTIVATION QUOTE
// =========================

const quotes = [
    "Small steps every day lead to big changes.",
    "You don't have to be perfect. Just keep moving.",
    "Make today count.",
    "Start where you are. Do what you can.",
    "Progress, not perfection.",
    "A little progress is still progress.",
    "You got this.",
    "Focus on what you can do today.",
    "One good day can change your whole week.",
    "Don't wait for motivation. Start, and let motivation follow."
];

const randomQuote =
    quotes[Math.floor(Math.random() * quotes.length)];

document.getElementById("quote").textContent = randomQuote;


// =========================
// TEXT INPUT
// =========================

const input = document.getElementById("taskInput");
const sendButton = document.getElementById("sendButton");
const status = document.getElementById("status");


// =========================
// STATUS
// =========================

function setStatus(message, processing = false) {

    status.innerHTML = "";

    if (!message) {
        status.classList.remove("processing");
        return;
    }

    // Purple dot

    const dot = document.createElement("span");

    dot.className = "status-dot";


    // Status text

    const text = document.createElement("span");

    text.textContent = message;


    status.appendChild(dot);
    status.appendChild(text);


    if (processing) {
        status.classList.add("processing");
    } else {
        status.classList.remove("processing");
    }

}


// =========================
// SEND BUTTON STATE
// =========================

function updateSendButton() {

    // Don't change the button while voice recording

    if (isListening) {
        return;
    }


    if (input.value.trim()) {

        sendButton.classList.add("has-text");

    } else {

        sendButton.classList.remove("has-text");

    }

}


// Watch normal typing

input.addEventListener("input", () => {
    updateSendButton();
});


// =========================
// SUBMIT TASK
// =========================

async function submitTask() {

    const text = input.value.trim();

    if (!text) {
        input.focus();
        return;
    }


    // Stop microphone before sending

    if (typeof stopVoiceRecognition === "function") {
        stopVoiceRecognition(false);
    }


    // UI state

    sendButton.disabled = true;

    sendButton.classList.remove("has-text");


    // =========================
    // SEND REQUEST
    // =========================

    async function sendRequest() {

        return await fetch("/api/tasks", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: text
            })

        });

    }


    try {

        // =========================
        // FIRST ATTEMPT
        // =========================

        setStatus(
            "Turning that into a plan...",
            true
        );


        let response = await sendRequest();


        // =========================
        // GEMINI 503
        // =========================

        if (response.status === 503) {

            let errorData = {};

            try {
                errorData = await response.json();
            } catch (error) {
                console.log("Could not read 503 response.");
            }


            if (errorData.retryable) {

                // Tell the user what's happening

                setStatus(
                    "Application is under high demand. Retrying...",
                    true
                );


                // Small delay before retrying

                await new Promise((resolve) => {
                    setTimeout(resolve, 1500);
                });


                // =========================
                // SECOND ATTEMPT
                // =========================

                response = await sendRequest();

            }

        }


        // =========================
        // READ RESPONSE
        // =========================

        const data = await response.json();


        // =========================
        // STILL FAILED
        // =========================

        if (!response.ok) {

            throw new Error(
                data.error || "Something went wrong."
            );

        }


        console.log("Tasks:", data.tasks);


        // =========================
        // DISPLAY TASKS
        // =========================

        const generatedTitles = data.tasks
            .map((task) => {
                return typeof task === "string" ? task : task.title;
            })
            .filter((task) => typeof task === "string" && task.trim());

        // Generating again keeps the existing replacement behaviour, while
        // recording the resulting list for this calendar day.
        // A request may span midnight, so refresh the active day before
        // associating the newly generated tasks with a date.
        syncActiveDay();

        const savedDay = TaskStorage.saveGeneratedTasks(
            activeDayKey,
            generatedTitles
        );

        renderTasks(savedDay.tasks, activeDayKey);


        // =========================
        // SCROLL TO FIRST TASK
        // =========================
        //
        // Once the tasks are generated, bring the
        // first task into the visible area.
        //
        // The page itself remains normally scrollable,
        // so longer task lists can continue below it.

        requestAnimationFrame(() => {

            const taskList = document.getElementById("taskList");
            const firstTask = taskList.querySelector(".task");

            if (firstTask) {
                firstTask.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

        });


        // Clear input

        input.value = "";

        updateSendButton();


        // Remove processing status

        setStatus("");


    } catch (error) {

        console.error(error);


        setStatus(
            "Couldn't turn that into tasks. Try again."
        );


        updateSendButton();


    } finally {

        sendButton.disabled = false;

    }

}


// =========================
// RENDER TASKS
// =========================

function renderTasks(tasks, dateKey = activeDayKey) {

    const taskList = document.getElementById("taskList");

    taskList.innerHTML = "";


    tasks.forEach((task) => {

        const taskElement = document.createElement("div");

        taskElement.className = "task";

        if (task.completed) {
            taskElement.classList.add("completed");
        }


        taskElement.innerHTML = `
            <button
                class="checkbox"
                aria-label="Complete task"
            ></button>

            <span class="task-title"></span>
        `;


        // Safely insert AI-generated text

        taskElement.querySelector(".task-title").textContent =
            task.title;


        // Checkbox

        const checkbox =
            taskElement.querySelector(".checkbox");


        checkbox.addEventListener("click", () => {

            taskElement.classList.toggle("completed");

            TaskStorage.setTaskCompleted(
                dateKey,
                task.id,
                taskElement.classList.contains("completed")
            );

            checkAllTasksCompleted();

        });


        taskList.appendChild(taskElement);

    });

    checkAllTasksCompleted();

}


// =========================
// ALL TASKS COMPLETED
// =========================

function checkAllTasksCompleted() {

    const taskList = document.getElementById("taskList");

    const tasks = taskList.querySelectorAll(".task");

    const completedTasks =
        taskList.querySelectorAll(".task.completed");


    // Remove existing message

    const existingMessage =
        document.getElementById("completionMessage");

    if (existingMessage) {
        existingMessage.remove();
    }


    // Nothing to check

    if (tasks.length === 0) {
        return;
    }


    // Check if every task is completed

    if (completedTasks.length === tasks.length) {

        const message =
            document.createElement("div");

        message.id = "completionMessage";

        message.className = "completion-message";

        message.textContent =
            "All done. You made it through today. ✦";


        taskList.appendChild(message);

    }

}


// =========================
// HISTORY CALENDAR
// =========================

const historyButton = document.getElementById("historyButton");
const historyOverlay = document.getElementById("historyOverlay");
const closeHistoryButton = document.getElementById("closeHistoryButton");
const previousMonthButton = document.getElementById("previousMonthButton");
const nextMonthButton = document.getElementById("nextMonthButton");
const calendarMonth = document.getElementById("calendarMonth");
const calendarGrid = document.getElementById("calendarGrid");
const selectedHistoryDate = document.getElementById("selectedHistoryDate");
const historyTaskList = document.getElementById("historyTaskList");

let activeDayKey = getDateKey();
let selectedHistoryDateKey = activeDayKey;
let displayedHistoryMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
);

function createDateFromKey(dateKey) {

    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);

}

function formatHistoryDate(dateKey) {

    return createDateFromKey(dateKey).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });

}

function isFullyCompleted(day) {

    return Boolean(
        day &&
        day.tasks.length > 0 &&
        day.tasks.every((task) => task.completed)
    );

}

function renderHistoryTasks() {

    const selectedDay = TaskStorage.getDay(selectedHistoryDateKey);

    selectedHistoryDate.textContent =
        formatHistoryDate(selectedHistoryDateKey);

    historyTaskList.innerHTML = "";

    if (!selectedDay || selectedDay.tasks.length === 0) {

        const emptyMessage = document.createElement("p");

        emptyMessage.className = "history-empty";
        emptyMessage.textContent =
            "No tasks were recorded for this day.";

        historyTaskList.appendChild(emptyMessage);
        return;

    }

    selectedDay.tasks.forEach((task) => {

        const taskElement = document.createElement("div");

        taskElement.className = "history-task";

        if (task.completed) {
            taskElement.classList.add("history-task--completed");
        }

        const state = document.createElement("span");

        state.className = "history-task-status";
        state.setAttribute("aria-hidden", "true");
        state.textContent = task.completed ? "✓" : "×";

        const title = document.createElement("span");

        title.className = "history-task-title";
        title.textContent = task.title;

        taskElement.appendChild(state);
        taskElement.appendChild(title);

        historyTaskList.appendChild(taskElement);

    });

}

function renderHistoryCalendar() {

    const year = displayedHistoryMonth.getFullYear();
    const month = displayedHistoryMonth.getMonth();
    const currentMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
    );
    const allDays = TaskStorage.getAllDays();

    calendarMonth.textContent = displayedHistoryMonth.toLocaleDateString(
        "en-US",
        {
            month: "long",
            year: "numeric"
        }
    );

    nextMonthButton.disabled =
        displayedHistoryMonth.getTime() >= currentMonth.getTime();

    calendarGrid.innerHTML = "";

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let index = 0; index < firstWeekday; index++) {

        const placeholder = document.createElement("span");

        placeholder.className = "calendar-day-placeholder";
        placeholder.setAttribute("aria-hidden", "true");

        calendarGrid.appendChild(placeholder);

    }

    for (let day = 1; day <= daysInMonth; day++) {

        const date = new Date(year, month, day);
        const dateKey = getDateKey(date);
        const dayRecord = allDays[dateKey];
        const calendarDay = document.createElement("button");

        calendarDay.type = "button";
        calendarDay.className = "calendar-day";
        calendarDay.textContent = day;
        calendarDay.setAttribute(
            "aria-label",
            formatHistoryDate(dateKey)
        );

        if (dayRecord && dayRecord.tasks.length > 0) {
            calendarDay.classList.add("calendar-day--active");
        }

        if (isFullyCompleted(dayRecord)) {
            calendarDay.classList.add("calendar-day--complete");
            calendarDay.setAttribute("aria-label", `${formatHistoryDate(dateKey)}, all tasks completed`);
        }

        if (dateKey === activeDayKey) {
            calendarDay.classList.add("calendar-day--today");
        }

        if (dateKey === selectedHistoryDateKey) {
            calendarDay.classList.add("calendar-day--selected");
        }

        calendarDay.addEventListener("click", () => {

            selectedHistoryDateKey = dateKey;
            renderHistoryCalendar();
            renderHistoryTasks();

        });

        calendarGrid.appendChild(calendarDay);

    }

}

function openHistory() {

    selectedHistoryDateKey = activeDayKey;
    displayedHistoryMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
    );

    renderHistoryCalendar();
    renderHistoryTasks();

    historyOverlay.classList.add("is-open");
    historyOverlay.setAttribute("aria-hidden", "false");
    closeHistoryButton.focus();

}

function closeHistory() {

    historyOverlay.classList.remove("is-open");
    historyOverlay.setAttribute("aria-hidden", "true");
    historyButton.focus();

}

historyButton.addEventListener("click", openHistory);
closeHistoryButton.addEventListener("click", closeHistory);

previousMonthButton.addEventListener("click", () => {

    displayedHistoryMonth = new Date(
        displayedHistoryMonth.getFullYear(),
        displayedHistoryMonth.getMonth() - 1,
        1
    );

    renderHistoryCalendar();

});

nextMonthButton.addEventListener("click", () => {

    const currentMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
    );

    if (displayedHistoryMonth.getTime() >= currentMonth.getTime()) {
        return;
    }

    displayedHistoryMonth = new Date(
        displayedHistoryMonth.getFullYear(),
        displayedHistoryMonth.getMonth() + 1,
        1
    );

    renderHistoryCalendar();

});

historyOverlay.addEventListener("click", (event) => {

    if (event.target === historyOverlay) {
        closeHistory();
    }

});

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape" && historyOverlay.classList.contains("is-open")) {
        closeHistory();
    }

});


// =========================
// SEND BUTTON
// =========================

sendButton.addEventListener("click", () => {

    // While recording,
    // send button becomes the voice confirmation button.

    if (isListening) {

        stopVoiceRecognition(false);

        return;

    }

    submitTask();

});


// =========================
// ENTER KEY
// =========================

input.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        event.preventDefault();

        if (!isListening) {
            submitTask();
        }

    }

});


// =========================
// MICROPHONE
// =========================

const micButton = document.getElementById("micButton");

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


let isListening = false;

let finalTranscript = "";


// =========================
// CHECK MICROPHONE SUPPORT
// =========================

if (!SpeechRecognition) {

    micButton.addEventListener("click", () => {

        setStatus(
            "Voice input isn't supported in this browser."
        );

    });

} else {

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";


    // =========================
    // MIC / VOICE BUTTON ICONS
    // =========================

    function setNormalButtons() {

        // Restore microphone

        micButton.innerHTML = `
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <rect
                    x="9"
                    y="2"
                    width="6"
                    height="12"
                    rx="3"
                ></rect>

                <path
                    d="M5 10a7 7 0 0 0 14 0"
                ></path>

                <line
                    x1="12"
                    y1="19"
                    x2="12"
                    y2="22"
                ></line>

                <line
                    x1="8"
                    y1="22"
                    x2="16"
                    y2="22"
                ></line>
            </svg>
        `;

        micButton.setAttribute(
            "aria-label",
            "Start voice input"
        );


        // Restore send icon

        sendButton.innerHTML = `
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M5 12h14"></path>
                <path d="M13 6l6 6-6 6"></path>
            </svg>
        `;

        sendButton.setAttribute(
            "aria-label",
            "Send task"
        );

        sendButton.classList.remove("voice-confirm");

        updateSendButton();

    }


    function setVoiceButtons() {

        // =========================
        // X BUTTON
        // =========================

        micButton.innerHTML = `
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                aria-hidden="true"
            >
                <line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                ></line>

                <line
                    x1="18"
                    y1="6"
                    x2="6"
                    y2="18"
                ></line>
            </svg>
        `;

        micButton.setAttribute(
            "aria-label",
            "Cancel voice input"
        );


        // =========================
        // CHECK BUTTON
        // =========================

        sendButton.innerHTML = `
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <polyline
                    points="5 12 10 17 19 7"
                ></polyline>
            </svg>
        `;

        sendButton.setAttribute(
            "aria-label",
            "Finish voice input"
        );

        sendButton.classList.add("voice-confirm");

    }


    // =========================
    // REQUEST MICROPHONE PERMISSION
    // =========================

    async function requestMicrophonePermission() {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            return false;

        }


        try {

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true
                });


            stream.getTracks().forEach((track) => {
                track.stop();
            });


            return true;

        } catch (error) {

            console.error(
                "Microphone permission error:",
                error
            );


            if (
                error.name === "NotAllowedError" ||
                error.name === "PermissionDeniedError"
            ) {

                setStatus(
                    "Microphone permission was denied."
                );

            } else if (error.name === "NotFoundError") {

                setStatus(
                    "No microphone was found."
                );

            } else {

                setStatus(
                    "Couldn't access the microphone."
                );

            }

            return false;

        }

    }


    // =========================
    // STOP VOICE RECOGNITION
    // =========================

    function stopVoiceRecognition(cancel = false) {

        if (!isListening) {
            return;
        }


        isListening = false;


        // Stop browser recognition

        try {

            recognition.stop();

        } catch (error) {

            console.log(
                "Speech stop error:",
                error
            );

        }


        // X = completely erase voice input

        if (cancel) {

            input.value = "";

        }


        micButton.classList.remove("listening");

        setNormalButtons();

        setStatus("");

        updateSendButton();

    }


    // Make available to submitTask()

    window.stopVoiceRecognition =
        stopVoiceRecognition;


    // =========================
    // MIC BUTTON
    // =========================

    micButton.addEventListener("click", async () => {

        // If already recording,
        // mic button acts as X / cancel.

        if (isListening) {

            stopVoiceRecognition(true);

            return;

        }


        // =========================
        // REQUEST MIC PERMISSION
        // =========================

        const permissionGranted =
            await requestMicrophonePermission();


        if (!permissionGranted) {

            return;

        }


        // =========================
        // START VOICE
        // =========================

        finalTranscript = "";

        // Clear existing text before voice starts

        input.value = "";


        try {

            recognition.start();

            isListening = true;

            micButton.classList.add("listening");

            setVoiceButtons();


            // Purple dot + pulse while listening

            setStatus(
                "Listening...",
                true
            );

        } catch (error) {

            console.log(
                "Speech start error:",
                error
            );


            isListening = false;

            micButton.classList.remove("listening");

            setNormalButtons();

            setStatus(
                "Couldn't start voice input. Try again."
            );

        }

    });


    // =========================
    // SPEECH RESULT
    // =========================

    recognition.onresult = (event) => {

        let interimTranscript = "";


        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            const transcript =
                event.results[i][0].transcript;


            if (event.results[i].isFinal) {

                finalTranscript +=
                    transcript + " ";

            } else {

                interimTranscript += transcript;

            }

        }


        // Update input

        input.value =
            finalTranscript + interimTranscript;


        // Keep newest spoken text visible

        input.scrollLeft = input.scrollWidth;

    };


    // =========================
    // RECOGNITION ENDED
    // =========================

    recognition.onend = () => {

        // If user is still recording,
        // automatically restart recognition.

        if (isListening) {

            try {

                recognition.start();

            } catch (error) {

                console.log(
                    "Speech restart error:",
                    error
                );

            }

            return;

        }


        micButton.classList.remove("listening");

        setNormalButtons();

        setStatus("");

    };


    // =========================
    // SPEECH ERROR
    // =========================

    recognition.onerror = (event) => {

        console.log(
            "Speech error:",
            event.error
        );


        // Ignore normal aborts

        if (event.error === "aborted") {
            return;
        }


        // Browser temporarily stopped
        // because there was no speech.

        if (event.error === "no-speech") {

            // Keep listening state and purple pulse

            setStatus(
                "Listening...",
                true
            );

            return;

        }


        // Microphone permission denied

        if (event.error === "not-allowed") {

            isListening = false;

            micButton.classList.remove("listening");

            setNormalButtons();

            setStatus(
                "Microphone permission was denied."
            );

            return;

        }


        status.textContent =
            "Couldn't hear that. Try again.";

    };

}


// =========================
// INITIAL SEND BUTTON STATE
// =========================

function loadActiveDayTasks() {

    const savedDay = TaskStorage.getDay(activeDayKey);

    renderTasks(
        savedDay ? savedDay.tasks : [],
        activeDayKey
    );

}

function syncActiveDay() {

    const currentDayKey = getDateKey();

    if (currentDayKey === activeDayKey) {
        return;
    }

    // A new local calendar day starts with a fresh active list. The older
    // record is preserved in storage and remains selectable in History.
    activeDayKey = currentDayKey;
    formatCurrentDate();
    loadActiveDayTasks();

    if (historyOverlay.classList.contains("is-open")) {
        renderHistoryCalendar();
        renderHistoryTasks();
    }

}

function scheduleDayChangeCheck() {

    const now = new Date();
    const nextDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
    );
    const waitTime = nextDay.getTime() - now.getTime() + 1000;

    window.setTimeout(() => {

        syncActiveDay();
        scheduleDayChangeCheck();

    }, waitTime);

}

document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {
        syncActiveDay();
    }

});

loadActiveDayTasks();
scheduleDayChangeCheck();
updateSendButton();
