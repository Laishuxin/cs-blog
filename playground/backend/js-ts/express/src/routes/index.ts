import express from "express";
import "express-async-errors";
export const router = express();

router.get("/", (req, res) => {
  throw new Error("this is an error");
  res.json({ message: "ok" });
});

router.get("/async-error", async (req, res, next) => {
  function _getUserFromDb() {
    return new Promise(() => {
      throw new Error("this is an error");
    });
  }

  const data = await _getUserFromDb();
  return res.json({ user: data }).end();
});
