const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');

// GET /api/tasks - Get all tasks with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, status, assignedTo, overdue } = req.query;

    // Build query
    let query = {};

    // If Member, show only tasks in their projects
    if (req.user.role === 'Member') {
      const userProjects = await Project.find({
        $or: [
          { createdBy: req.user._id },
          { teamMembers: req.user._id }
        ]
      }).select('_id');

      query.project = { $in: userProjects.map(p => p._id) };
    }

    // Apply filters
    if (projectId) query.project = projectId;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Filter overdue tasks if requested
    let filteredTasks = tasks;
    if (overdue === 'true') {
      filteredTasks = tasks.filter(task =>
        task.dueDate < new Date() && task.status !== 'Completed'
      );
    }

    res.json({
      success: true,
      count: filteredTasks.length,
      tasks: filteredTasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
});

// GET /api/tasks/dashboard - Get dashboard statistics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    // Get user's projects
    let projectIds;
    if (req.user.role === 'Admin') {
      const allProjects = await Project.find().select('_id');
      projectIds = allProjects.map(p => p._id);
    } else {
      const userProjects = await Project.find({
        $or: [
          { createdBy: req.user._id },
          { teamMembers: req.user._id }
        ]
      }).select('_id');
      projectIds = userProjects.map(p => p._id);
    }

    // Get all tasks for user's projects
    const allTasks = await Task.find({ project: { $in: projectIds } })
      .populate('project', 'name')
      .populate('assignedTo', 'name email');

    // Calculate statistics
    const totalTasks = allTasks.length;
    const todoTasks = allTasks.filter(t => t.status === 'To Do').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'In Progress').length;
    const completedTasks = allTasks.filter(t => t.status === 'Completed').length;

    const now = new Date();
    const overdueTasks = allTasks.filter(t =>
      t.dueDate < now && t.status !== 'Completed'
    );

    // Tasks assigned to current user
    const myTasks = allTasks.filter(t =>
      t.assignedTo && t.assignedTo._id.toString() === req.user._id.toString()
    );

    res.json({
      success: true,
      dashboard: {
        totalTasks,
        todoTasks,
        inProgressTasks,
        completedTasks,
        overdueCount: overdueTasks.length,
        overdueTasks: overdueTasks.map(t => ({
          id: t._id,
          title: t.title,
          project: t.project.name,
          dueDate: t.dueDate,
          status: t.status
        })),
        myTasksCount: myTasks.length,
        myTasks: myTasks.slice(0, 5).map(t => ({
          id: t._id,
          title: t.title,
          project: t.project.name,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name description')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message
    });
  }
});

// POST /api/tasks - Create new task
router.post('/',
  authenticate,
  [
    body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('project').notEmpty().withMessage('Project is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority'),
    body('assignedTo').optional().notEmpty().withMessage('Assigned user ID cannot be empty')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { title, description, project, assignedTo, priority, dueDate } = req.body;

      // Verify project exists
      const projectExists = await Project.findById(project);
      if (!projectExists) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check if user has access to this project
      const hasAccess = req.user.role === 'Admin' ||
        projectExists.createdBy.toString() === req.user._id.toString() ||
        projectExists.teamMembers.some(member => member.toString() === req.user._id.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this project'
        });
      }

      // Create task
      const task = new Task({
        title,
        description,
        project,
        assignedTo: assignedTo || null,
        createdBy: req.user._id,
        priority: priority || 'Medium',
        dueDate
      });

      await task.save();

      await task.populate('project', 'name');
      await task.populate('assignedTo', 'name email');
      await task.populate('createdBy', 'name email');

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating task',
        error: error.message
      });
    }
  }
);

// PUT /api/tasks/:id - Update task
router.put('/:id',
  authenticate,
  [
    body('title').optional().trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
    body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
    body('status').optional().isIn(['To Do', 'In Progress', 'Completed']).withMessage('Invalid status'),
    body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority'),
    body('dueDate').optional().isISO8601().withMessage('Valid due date is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const task = await Task.findById(req.params.id).populate('project');

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check if user has access to update this task
      const hasAccess = req.user.role === 'Admin' ||
        task.createdBy.toString() === req.user._id.toString() ||
        (task.assignedTo && task.assignedTo.toString() === req.user._id.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to update this task'
        });
      }

      // Update fields
      const { title, description, status, priority, dueDate, assignedTo } = req.body;
      if (title) task.title = title;
      if (description) task.description = description;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (dueDate) task.dueDate = dueDate;
      if (assignedTo !== undefined) task.assignedTo = assignedTo || null;

      await task.save();
      await task.populate('project', 'name');
      await task.populate('assignedTo', 'name email');
      await task.populate('createdBy', 'name email');

      res.json({
        success: true,
        message: 'Task updated successfully',
        task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating task',
        error: error.message
      });
    }
  }
);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only Admin or task creator can delete
    if (req.user.role !== 'Admin' && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin or task creator can delete.'
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
});

module.exports = router;
