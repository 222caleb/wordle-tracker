const SUPABASE_URL = "https://shwwzovanprmfesgaerr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNod3d6b3ZhbnBybWZlc2dhZXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjcwNDEsImV4cCI6MjA5MDY0MzA0MX0.Q3I-EkjE9B6gpikVnhNEyhdkxbjtYCIe7iFreueAV6o";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allScores = [];
let scoresChannel = null;
let isAdmin = false;
let currentMonth = new Date().getMonth();
let historyFilter = 'ALL';

const PLAYERS = ['Jeff','Tristan','Nana','Daniel','Caleb'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Hardcoded
const FAIL_GIFS = [
  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWg2YTk3amgyMWVjbzdsb3ViZzB4eDE5dXQ2ajNpMnh1aDloYWQ0byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4bDXKRN2arfPy/giphy.gif',
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzFzZnJ1OGd3N2Rvd3VncjluMnJ4c3d1MXN1NDBjd2E3eWowZmI2eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aRr0zGv8fp1Tuw9Ggr/giphy.gif',
  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHQydDhmcTRhMHlhemcxdmsxY2k2NGY5MnZuaXp4Y3loazE0ejR3NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/147x2yqFabHNok/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExOG5qbXJha3NrM3Y3ZHY0Y2I2eDNhZGQ2YnhpbnpyZm9mdGN2MjM1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3SW86aYUvfqcaZ8G8P/giphy.gif',
];

const CLOSE_CALL_GIFS = [
  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXdna2Z2bHVqazgxY3hmeWF0NzZndDdtaG01b2kzdGpjOWgzZnNydiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/T8wFJIdigCEzvpjzJx/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmxsMzZuajJkZTd2ZWV1ZXU0eTgxcmFtN3ZvMmplYzRteW5wbmo2YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sagZGSVOFwywexuZMm/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGdma2pqZW1wdWl6dmhvbm51M25kMmNhbHUxa3U0djg0cGtqNWVtbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bxOtA69x3IB20/giphy.gif',
];

function getFailGif() {
  return FAIL_GIFS[Math.floor(Math.random() * FAIL_GIFS.length)];
}

function getCloseCallGif() {
  return CLOSE_CALL_GIFS[Math.floor(Math.random() * CLOSE_CALL_GIFS.length)];
}

function getReaction(score) {
  if (score === 1 || score === 2) {
    return { text: 'KABLOOIE!!', cls: 'reaction-kablooie' };
  }
  if (score === 3) {
    return { text: '💥', cls: 'reaction-boom' };
  }
  if (score === 5 || score === '5') {
    return { gif: getCloseCallGif(), cls: 'reaction-close' };
  }
  if (score === 'X' || score === 6 || score === '6') {
    return { gif: getFailGif(), cls: 'reaction-rip' };
  }
  return null;
}
