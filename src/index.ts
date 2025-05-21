import express from 'express';
import identifyRouter from './routes/identify';

const app = express();
app.use(express.json());

app.use('/api/identify', identifyRouter); // ✅ not the controller directly

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
