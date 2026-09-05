const API_BASE = "https://church.teodordev.co.za/api";

document
    .getElementById("loginForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("email").value;

        const password =
            document.getElementById("password").value;

        try {

            const response = await fetch(
                `${API_BASE}/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                });

                console.log(response.status);
console.log(await response.clone().text());

            if (!response.ok) {
                throw new Error();
            }

            const data = await response.json();

            saveToken(data.token);

            window.location.href = "index.html";

        } catch {

            document.getElementById("loginError").textContent =
                "Invalid email or password.";

        }

    });