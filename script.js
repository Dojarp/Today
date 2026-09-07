// =========================
// DATE
// =========================

const currentDate = document.getElementById("currentDate");

const today = new Date();

const day = today.getDate();

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

const month = today.toLocaleDateString("en-US", {
    month: "long"
});

const year = today.getFullYear();

currentDate.textContent =
    `${day}${getOrdinal(day)} ${month} ${year}`;


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


    // Show processing status + purple pulse

    setStatus(
        "Turning that into a plan...",
        true
    );


    try {

        const response = await fetch("/api/tasks", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: text
            })

        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Something went wrong."
            );

        }


        console.log("Tasks:", data.tasks);


        // Display tasks

        renderTasks(data.tasks);


        // Clear input

        input.value = "";

        updateSendButton();


        // Remove status + purple dot

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

function renderTasks(tasks) {

    const taskList = document.getElementById("taskList");

    taskList.innerHTML = "";


    tasks.forEach((task) => {

        const taskElement = document.createElement("div");

        taskElement.className = "task";


        taskElement.innerHTML = `
            <button
                class="checkbox"
                aria-label="Complete task"
            ></button>

            <span class="task-title"></span>
        `;


        // Safely insert AI-generated text

        taskElement.querySelector(".task-title").textContent =
            task;


        // Checkbox

        const checkbox =
            taskElement.querySelector(".checkbox");


        checkbox.addEventListener("click", () => {

            taskElement.classList.toggle("completed");

        });


        taskList.appendChild(taskElement);

    });

}


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

updateSendButton();