New Concepts Learned:

Middleware: Code that runs before your main logic (like the JSON translator).

Request (req): An object containing everything the user sent us (headers, body, IP address).

Response (res): Our way of talking back to the user. Without this, the "loading spinner" on the website never stops.

POST vs GET: We used POST because we are creating something new in our system.

How to test this (The "Backend" way)
Since our frontend isn't connected yet, we test this using a tool called Postman (or an extension in VS Code called "Thunder Client").

Run your server: node app.js

Open Postman.

Set the method to POST.

Enter the URL: http://localhost:3000/api/bookings

Go to the Body tab > raw > JSON.

Paste this:

JSON

{
"name": "Test Client",
"phone": "555-0199",
"service": "Classic Haircut",
"date": "2026-01-20"
}
Hit Send.

---

Jouranl Entry: The "module not found" error

---

ournal Entry: The "Module Not Found" Error
What happened: You told Node.js to require('express'), but Node looked in your project folder and couldn't find the Express "toolbox." Even if you installed it earlier, if the node_modules folder isn't in this specific directory, it won't work.

How to read the error: The key line is code: 'MODULE_NOT_FOUND'. This is the computer saying: "You asked for a tool named Express, but I don't have it in my shop."

🛠 The Fix: Installing the Dependencies
Run this command in your terminal (make sure you are inside the Headzup-Barbershop-Website folder):

Bash

npm install express
What this does:

It reaches out to the internet (NPM registry).

It downloads the Express code.

It creates a folder called node_modules (this is where the actual code lives).

It updates your package.json to say "This project officially needs Express."

📝 Documenting the "Learning Moment"
Add this to your docs/journal.md under a section called "Troubleshooting":

Error: MODULE_NOT_FOUND

Cause: Trying to run a script that imports a library that hasn't been downloaded to the local node_modules folder.

Solution: Run npm install [package-name].

Key Lesson: Every time you start a project on a new computer or a new folder, you must run npm install to "build" your local toolbox.

🚀 Try running it again
Once that install finishes, try the command again:

Bash

node app.js
