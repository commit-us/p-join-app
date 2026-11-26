import express from "express";

const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "p-join-api" });
});

export default app;
