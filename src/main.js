import { placeholder } from './game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0f0';
ctx.fillText(placeholder(), 10, 20);
