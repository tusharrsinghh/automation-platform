const authService = require("../services/authService");

async function register(req, res) {
  try {
    const { email, password, workspaceName } = req.body;

    if (!email || !password || !workspaceName) {
      return res.status(400).json({
        error: "email, password, and workspaceName are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    const result = await authService.registerUser({
      email,
      password,
      workspaceName,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Registration error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "email and password are required",
      });
    }

    const result = await authService.loginUser({
      email,
      password,
    });

    res.json(result);
  } catch (error) {
    console.error("Login error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function me(req, res) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);

    res.json({
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

module.exports = {
  register,
  login,
  me,
};