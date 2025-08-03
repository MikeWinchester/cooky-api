import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import recipeRoutes from './routes/recipe.routes';
import ingredientRoutes from './routes/ingredient.routes';
import shoppingRoutes from './routes/shopping.routes';
import errorMiddleware from './middlewares/error.middleware';
import config from './config/env';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/recipes', recipeRoutes);
app.use('/ingredients', ingredientRoutes);
app.use('/shopping-lists', shoppingRoutes);

// Error handling
app.use(errorMiddleware.handleError);
app.use(errorMiddleware.handleNotFound);

export default app;