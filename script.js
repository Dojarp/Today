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

async function submitTask() {

    const text = input.value.trim();

    if (!text) {
        input.focus();
        return;
    }


    // UI state

    sendButton.disabled = true;

    status.textContent = "Turning that into a plan...";


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

        status.textContent = "";


    } catch (error) {

        console.error(error);

        status.textContent =
            "Couldn't turn that into tasks. Try again.";


    } finally {

        sendButton.disabled = false;

    }

}
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



// Send button

sendButton.addEventListener("click", submitTask);


// Enter key

input.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        submitTask();
    }

});


// =========================
// MICROPHONE
// =========================

const micButton = document.getElementById("micButton");

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (!SpeechRecognition) {

    micButton.addEventListener("click", () => {

        status.textContent =
            "Voice input isn't supported in this browser.";

    });

} else {

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.lang = "en-IN";


    // Start listening

    micButton.addEventListener("click", () => {

        try {

            recognition.start();

            micButton.classList.add("listening");

            status.textContent = "Listening...";

        } catch (error) {

            console.log(error);

        }

    });


    // Speech result

    recognition.onresult = (event) => {

        let transcript = "";

        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            transcript +=
                event.results[i][0].transcript;

        }

        input.value = transcript;

    };


    // Finished listening

    recognition.onend = () => {

        micButton.classList.remove("listening");

        status.textContent = "";

    };


    // Error

    recognition.onerror = (event) => {

        micButton.classList.remove("listening");

        console.log("Speech error:", event.error);

        if (event.error === "not-allowed") {

            status.textContent =
                "Microphone permission was denied.";

        } else {

            status.textContent =
                "Couldn't hear that. Try again.";

        }

    };

}