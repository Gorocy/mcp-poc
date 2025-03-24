import express, { Request, Response } from 'express';
import cors from 'cors';
import slugify from 'slugify';
import Surreal from 'surrealdb';
import dotenv from 'dotenv';

dotenv.config();

const SURREALDB_URL = process.env.SURREALDB_URL;
const SURREALDB_USER = process.env.AUTH_SURREALDB_USERNAME;
const SURREALDB_PASSWORD = process.env.AUTH_SURREALDB_PASSWORD;
const SERVICE_PORT = process.env.SERVICE_PORT;

if (!SURREALDB_URL || !SURREALDB_USER || !SURREALDB_PASSWORD || !SERVICE_PORT) {
  throw new Error('Missing environment variables');
}

const db = new Surreal();
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000; // 5 seconds

async function initDatabase() {
  try {
    // Connect to SurrealDB
    await db.connect(SURREALDB_URL as string);
    
    // Correct way to login - without namespace in parameters
    await db.signin({
      username: SURREALDB_USER as string,
      password: SURREALDB_PASSWORD as string
    });
    
    // Select namespace and database after login
    await db.use({
      namespace: 'mcp',
      database: 'knowledge'
    });
    
    console.log('Connected to SurrealDB');
    isConnected = true;
    reconnectAttempts = 0;
  } catch (error) {
    console.error('Database connection error:', error);
    isConnected = false;
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_INTERVAL}ms`);
      
      // Schedule reconnection attempt
      setTimeout(() => {
        console.log('Attempting to reconnect to database...');
        initDatabase();
      }, RECONNECT_INTERVAL);
    } else {
      console.error('Max reconnection attempts reached. Exiting...');
      process.exit(1);
    }
  }
}

async function disconnectDatabase() {
  try {
    await db.close();
    console.log('Disconnected from SurrealDB');
    isConnected = false;
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
}

const app = express();

app.use(cors());
app.use(express.json());

type knowledge = {
  content: string,
  topic: string,
  id: string
}
app.get('/knowledge/:topic', async (req: Request, res: Response) => {
  try {
    console.log("Fetch for :", req.params.topic);

    const result = await db.query<knowledge[]>(`SELECT * FROM knowledge WHERE topic = '${req.params.topic}'`);

    if (!result) {
      return res.status(404).send('No topics found');
    }
    let response;
    if (Array.isArray(result[0])) {
      response = result[0][0];
    } else {
      response = result[0];
    }
    
    console.log("Result:", response);
    return res.json(response);
  } catch (error) {
    console.error('Error fetching topics:', error);
    // If connection error, attempt to reconnect
    if (!isConnected) {
      initDatabase();
    }
    return res.status(500).send('Internal Server Error');
  }
});

app.get('/knowledge', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT topic FROM knowledge');
    const queryResult = result as unknown as [{ result: Array<{ topic: string }> }];
    return res.json(queryResult);
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    // If connection error, attempt to reconnect
    if (!isConnected) {
      initDatabase();
    }
    return res.status(500).send('Internal Server Error');
  }
});

app.post('/knowledge', async (req: Request, res: Response) => {
  const { topic, content } = req.body;

  console.log('Received POST request for /knowledge:', { topic, content });

  if (!topic || !content) {
    console.log('Missing topic or content');
    return res.status(400).send('Missing topic or content');
  }

  const topicIdentifierSlug = slugify.default(topic);
  console.log('Slug for topic:', topicIdentifierSlug);

  try {
    // Add new knowledge
    console.log('Attempting to save to database:', { topic: topicIdentifierSlug, content });
    const result = await db.query(
      'CREATE knowledge SET topic = $topic, content = $content',
      { topic: topicIdentifierSlug.toLowerCase(), content: content }
    );
    
    console.log('Database query result:', result);
    res.status(201).send('Knowledge created');
  } catch (error) {
    console.error('Error creating knowledge:', error);
    // If connection error, attempt to reconnect
    if (!isConnected) {
      initDatabase();
    }
    return res.status(409).send('Topic already exists or server error');
  }
});

// Initialize database before starting the server
initDatabase().then(() => {
  app.listen(SERVICE_PORT, () => {
    console.log(`Service running on port ${SERVICE_PORT}`);
  });
});
