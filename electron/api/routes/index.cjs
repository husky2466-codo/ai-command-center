/**
 * Routes Aggregator
 * Imports all route modules and mounts them at their appropriate paths
 */

const express = require('express');

// Import all route modules
const healthRoutes = require('./health.cjs');
const projectsRoutes = require('./projects.cjs');
const tasksRoutes = require('./tasks.cjs');
const remindersRoutes = require('./reminders.cjs');
const knowledgeRoutes = require('./knowledge.cjs');
const contactsRoutes = require('./contacts.cjs');
const spacesRoutes = require('./spaces.cjs');
const memoriesRoutes = require('./memories.cjs');
const dgxRoutes = require('./dgx.cjs');
const calendarRoutes = require('./calendar.cjs');
const emailsRoutes = require('./emails.cjs');

const router = express.Router();

// Mount routes at their paths
router.use('/', healthRoutes);              // /api/health, /api/status
router.use('/projects', projectsRoutes);    // /api/projects/*
router.use('/tasks', tasksRoutes);          // /api/tasks/*
router.use('/reminders', remindersRoutes);  // /api/reminders/*
router.use('/knowledge', knowledgeRoutes);  // /api/knowledge/*
router.use('/contacts', contactsRoutes);    // /api/contacts/*
router.use('/spaces', spacesRoutes);        // /api/spaces/*
router.use('/memories', memoriesRoutes);    // /api/memories/*
router.use('/dgx', dgxRoutes);              // /api/dgx/*
router.use('/calendar', calendarRoutes);    // /api/calendar/*
router.use('/emails', emailsRoutes);        // /api/emails/*

module.exports = router;
