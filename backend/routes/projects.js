const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const { authenticate, isAdmin } = require('../middleware/auth');

// GET /api/projects - Get all projects (accessible by all authenticated users)
router.get('/', authenticate, async (req, res) => {
  try {
    // Members see only projects they're part of, Admins see all
    let query = {};
    if (req.user.role === 'Member') {
      query = {
        $or: [
          { createdBy: req.user._id },
          { teamMembers: req.user._id }
        ]
      };
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .populate('teamMembers', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('teamMembers', 'name email role');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access to this project
    const hasAccess = req.user.role === 'Admin' ||
      project.createdBy._id.toString() === req.user._id.toString() ||
      project.teamMembers.some(member => member._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching project',
      error: error.message
    });
  }
});

// POST /api/projects - Create new project (Admin only)
router.post('/',
  authenticate,
  isAdmin,
  [
    body('name').trim().isLength({ min: 3 }).withMessage('Project name must be at least 3 characters'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('teamMembers').optional().isArray().withMessage('Team members must be an array')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { name, description, teamMembers } = req.body;

      // Create project
      const project = new Project({
        name,
        description,
        createdBy: req.user._id,
        teamMembers: teamMembers || []
      });

      await project.save();

      // Populate references
      await project.populate('createdBy', 'name email');
      await project.populate('teamMembers', 'name email role');

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating project',
        error: error.message
      });
    }
  }
);

// PUT /api/projects/:id - Update project (Admin or project creator)
router.put('/:id',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 3 }).withMessage('Project name must be at least 3 characters'),
    body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
    body('status').optional().isIn(['Active', 'Completed', 'On Hold']).withMessage('Invalid status'),
    body('teamMembers').optional().isArray().withMessage('Team members must be an array')
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

      const project = await Project.findById(req.params.id);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Only Admin or project creator can update
      if (req.user.role !== 'Admin' && project.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only Admin or project creator can update.'
        });
      }

      // Update fields
      const { name, description, status, teamMembers } = req.body;
      if (name) project.name = name;
      if (description) project.description = description;
      if (status) project.status = status;
      if (teamMembers) project.teamMembers = teamMembers;

      await project.save();
      await project.populate('createdBy', 'name email');
      await project.populate('teamMembers', 'name email role');

      res.json({
        success: true,
        message: 'Project updated successfully',
        project
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating project',
        error: error.message
      });
    }
  }
);

// DELETE /api/projects/:id - Delete project (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting project',
      error: error.message
    });
  }
});

module.exports = router;
