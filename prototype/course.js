// The Contracts path: five Hatchery lessons that keep building the same lib.rs.
import {chapters as first, reference} from './lesson1.js';
import {lesson as keepers} from './lesson2.js';
import {lesson as moths} from './lesson3.js';
import {lesson as battles} from './lesson4.js';
import {lesson as trading} from './lesson5.js';

export const lessons = [
  {id: 'hatchery', n: 1, title: 'The Hatchery', reference, chapters: first},
  keepers, moths, battles, trading,
];
export const chapters = lessons.flatMap((lesson, l) => lesson.chapters.map(c => ({...c, lesson: l})));
export const lessonCode = l => chapters.filter(c => c.lesson === l && c.kind === 'code');
