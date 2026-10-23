const API_KEY = "AIzaSyAs2iKb6OvGCjV726bb1OWfWRLOjmewX0U";
const candidateEmails = [
  "sanika@example.com",
  "rohan@example.com",
  "staff@example.com",
  "staff@test.com",
  "sanika@aksharbharati.org",
  "rahul@aksharbharati.org",
  "staff@aksharbharati.org",
  "katarmalmananofficial@gmail.com",
  "rahilpatel112399@gmail.com",
  "rahilbhoot7@gmail.com",
  "test@example.com",
  "staff@test.org",
  "owner@example.com",
  "admin@example.com",
];

for (const email of candidateEmails) {
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "TemporaryTestPassword123!", returnSecureToken: false }),
    });
    const data = await res.json();
    if (data.error) {
      console.log(`${email}: ${data.error.message}`);
    } else {
      console.log(`NEWLY CREATED: ${email}, uid = ${data.localId}`);
    }
  } catch (err) {
    console.log(`${email}: fetch error ${err.message}`);
  }
}
