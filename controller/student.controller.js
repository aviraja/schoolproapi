const db = require('../models')
const Student = db.students
const Op = db.Sequelize.Op
const excel = require('exceljs')
const fs = require('fs')
const { NOW } = require('sequelize')
const path = require('path')

// Create and Save a new Student
exports.create = (req, res) => {
  // Validate request

  const student = {
    full_name: req.body.full_name,
    school_name: req.body.school_name,
    mobile_1: req.body.mobile_1,
    mobile_2: req.body.mobile_2,
    address: req.body.address,
    grno: req.body.grno,
    standard: req.body.standard,
    division: req.body.division,
    school_id: req.body.school_id,
    blood_group: req.body.blood_group,
    date_of_birth: req.body.date_of_birth,
    photo: req.body.photo,
    photo_name: req.body.photo_name,
    date_time:
      new Date().toLocaleString('en-us', { timeZone: 'Asia/Calcutta' }) + '',
  }
  if (!req.body.full_name) {
    res.status(400).send({
      message: 'Content can not be empty!',
    })
    return
  }
  // Save Student in the database
  Student.create(student)
    .then((data) => {
      res.send(data)
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || 'Some error occurred while creating the Student.',
      })
    })
}

exports.findAll = async (req, res) => {
  try {
    const schoolId = req.query.school // get the school name from the query parameter
    const students = await Student.findAll({
      where: {
        school_id: schoolId,
      },
    })
    if (students.length === 0) {
      return res
        .status(404)
        .send({ error: 'Data not found for school in database' })
    }

    {
      const workbook = new excel.Workbook()

      const worksheet = workbook.addWorksheet('Students')

      worksheet.columns = [
        { header: 'Name', key: 'full_name', width: 20 },
        { header: 'School', key: 'school_name', width: 30 },
        { header: 'Mobile 1', key: 'mobile_1', width: 15 },
        { header: 'Mobile 2', key: 'mobile_2', width: 15 },
        { header: 'Address', key: 'address', width: 40 },
        { header: 'Gr. No', key: 'grno', width: 10 },
        { header: 'Standard', key: 'standard', width: 15 },
        { header: 'Division', key: 'division', width: 15 },
        { header: 'Date of Birth', key: 'date_of_birth', width: 30 },
        { header: 'School-Id', key: 'school_id', width: 15 },
        { header: 'Photo Name', key: 'photo_name', width: 30 },
        { header: 'Blood Group', key: 'blood_group', width: 40 },
        { header: 'Date Time', key: 'date_time', width: 30 },
      ]

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true }
      })

      worksheet.columns.forEach((column) => {
        column.alignment = { wrapText: true, horizontal: 'left' }
      })

      students.forEach((student) => {
        worksheet.addRow(student)
      })

      const fileName = `${schoolId}-students.xlsx`
      await workbook.xlsx.writeFile(fileName)
      res.set('content-disposition', `attachment; filename=${fileName}.zip`)

      res.download(fileName, (err) => {
        fs.unlink(fileName, () => {})
      })
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Error downloading students')
  }
}

exports.getImage = (imageDirectory) => async (req, res) => {
  try {
    const { schoolId, imageName } = req.params
    const imagePath = path.resolve(
      path.join(imageDirectory.replace('app', ''), schoolId, imageName),
    )

    return new Promise((resolve, reject) => {
      res.sendFile(imagePath, (error) => {
        if (error) {
          console.error(error)
          reject(error)
        } else {
          resolve()
        }
      })
    }).catch((error) => {
      console.error(error)
      res
        .status(500)
        .json({ error: 'An error occurred while fetching students photo' })
    })
  } catch (error) {
    console.error('Error fetching students:', error)
    res.status(500).json({ error: 'An error occurred while fetching students' })
  }
}

exports.fetchReports = async (req, res) => {
  try {
    const { schoolId, page, name, mobile1, standard } = req.query
    const limit = 50
    const offset = (page - 1) * limit

    const whereCondition = {
      full_name: name ? { [Op.like]: `%${name}%` } : undefined,
      mobile_1: mobile1 ? { [Op.like]: `%${mobile1}%` } : undefined,
      standard: standard ? { [Op.like]: `%${standard}%` } : undefined,
    }

    // Remove undefined filters
    Object.keys(whereCondition).forEach((key) => {
      if (whereCondition[key] === undefined) {
        delete whereCondition[key]
      }
    })

    const students = await Student.findAndCountAll({
      where: { ...whereCondition, school_id: schoolId },
      limit,
      offset,
    })

    const totalPages = Math.ceil(students.count / limit)

    res.json({ students: students.rows, totalPages })
  } catch (error) {
    console.error('Error fetching students:', error)
    res.status(500).json({ error: 'An error occurred while fetching students' })
  }
}
