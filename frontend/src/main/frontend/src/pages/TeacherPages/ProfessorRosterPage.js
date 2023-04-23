import React, { useState, useEffect } from "react";
import axios from "axios";
import classes from "./RosterModule.css";
import {getCourseDetailsAsync, getCoursesAsync, getCurrentCourseStudentsAsync} from "../../redux/features/courseSlice";

const Roster = (props) => {
    const dispatch = useDispatch()
    const { currentCourse } = useSelector((state) => state.courses)
    const courseParse = window.location.pathname;
    const url = `${process.env.REACT_APP_URL}/manage/professor/courses`
    const { currentCourseStudents } = useSelector((state) => state.courses)
    let navigate = useNavigate()
    let { courseId } = useParams()
    const [showModal, setShow] = useState(false)
    const csvFormData = new FormData()
    /* Might need to change this, I don't remember how the URL is formatted
       for this page */
    // const [courseId, setCourseId] = useState(window.location.href.split('/')[-1]);

    /* Comment this back in once you don't wanna use dummy data anymore */
    const [getRoster, setRoster] = useState([
        {name: 'James', student_id: 'jlafarr', team: 'blah'},
        {name: 'James', student_id: 'jlafarr', team: 'blah'}
    ]);

    useEffect(() => {
        dispatch(getCurrentCourseStudentsAsync(courseId))
    }, [dispatch, courseId])

    const [formData, setFormData] = useState({
        Name: '',
        Email: '',
    })

    /**
     * Retrieves all the students in the course and searches through the data and returns the student
     */
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const searchStudent = currentCourseStudents.filter((student) => {
        return (
            student &&
            (student.first_name
                ? student.first_name.toLowerCase().includes(searchTerm.toLowerCase())
                : '') ||
            (student.last_name
                ? student.last_name.toLowerCase().includes(searchTerm.toLowerCase())
                : '') ||
            (student.student_id
                ? student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
                : '') ||
            (student.team !== null
                ? student.team.toString().includes(searchTerm.toLowerCase())
                : '')
        );
    });

    /**
     * Function uses gets the currentCourseStudents data and maps over it to get an array of student names.
     * It then creates a dropdown and checkboxes for each student name, and adds event listeners to the checkboxes
     * to update the selectedStudents object
     */
    const filterStudent = {
        filterStudents: async function(courseId) {
            const studentData = useSelector(state => state.courses.currentCourseStudents);
            const studentNames = studentData.map(student => student.first_name + ' ' + student.last_name);
            const selectedStudents = {};
            const dropdown = document.createElement('select');
            dropdown.addEventListener('change', () => {
                const selectedOptions = Array.from(dropdown.options).filter(option => option.selected);
                const selectedNames = selectedOptions.map(option => option.value);
                studentCheckboxes.forEach(checkbox => {
                    checkbox.checked = selectedNames.includes(checkbox.value);
                    if (checkbox.checked) {
                        selectedStudents[checkbox.value] = true;
                    } else {
                        delete selectedStudents[checkbox.value];
                    }
                });
            });
            const studentCheckboxes = studentNames.map(name => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = name;
                checkbox.addEventListener('change', event => {
                    if (event.target.checked) {
                        selectedStudents[name] = true;
                    } else {
                        delete selectedStudents[name];
                    }
                    const selectedNames = Object.keys(selectedStudents);
                    const selectedOptions = Array.from(dropdown.options).filter(option => selectedNames.includes(option.value));
                    selectedOptions.forEach(option => option.selected = true);
                });
                const label = document.createElement('label');
                label.textContent = name;
                label.insertBefore(checkbox, label.firstChild);
                document.body.appendChild(label);
                return checkbox;
            });
            const button = document.createElement('button');
            button.style.display = 'none';
            const filteredStudents = new Promise(resolve => {
                const filterData = () => {
                    const filteredData = studentData.filter(
                        student => selectedStudents[student.first_name + ' ' + student.last_name]
                    );
                    resolve(filteredData);
                };
                dropdown.addEventListener('change', filterData);
                studentCheckboxes.forEach(checkbox => checkbox.addEventListener('change', filterData));
            });
            document.body.appendChild(dropdown);
            document.body.appendChild(button);
            return filteredStudents;
        },
    };

    /**
     * Retrieves all the assignment submisions of a student for the course
     */
    const onRosterClick = async (studentID) => {
        const url = `${process.env.REACT_APP_URL}/assignments/student/${courseId}/${studentID}/course-assignment-files-student`

        await axios
            .get(url, { responseType: 'blob' })
            .then((res) => {
                prepareStudentFile(res['headers']['content-disposition'], res.data.text())
            })
    }
    /**
     * Prepares the submission file for bulk download
     */
    const prepareStudentFile = (teamDataName, teamData) => {
        var filename = ''
        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        var matches = filenameRegex.exec(teamDataName)
        if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '')
        }
        teamData.then((res) => {
            downloadFile(base64StringToBlob(res, 'application/zip'), filename)
        })
    }
    /**
     * Bulk Downloads the submissions
     */
    const downloadFile = (blob, fileName) => {
        const fileURL = URL.createObjectURL(blob)
        const href = document.createElement('a')
        href.href = fileURL
        href.download = fileName
        href.click()
    }

    /**
     * Upload the CSV for the course
     */
    const uploadCsv = async () => {
        await axios
            .post(uploadCsvUrl, csvFormData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((res) => {
                window.alert('CSV successfully uploaded!')
            })
            .catch((e) => {
                console.error(e.response.data)
                window.alert('Error uploading CSV. Please try again.')
            })
        dispatch(getCourseDetailsAsync(courseId))
        navigate('/professor/' + courseId)
    }

    const updateCourse = async (data) => {
        const finalData = { ...data, course_id: currentCourse.course_id }

        await axios
            .put(updateUrl, finalData)
            .then((res) => {
                courseId = res.data
                window.alert('Course successfully updated!')
                if (csvFormData.get('csv_file') != null) {
                    uploadCsv()
                } else {
                    dispatch(getCourseDetailsAsync(res.data))
                    navigate('/professor/' + res.data)
                }
            })
            .catch((e) => {
                console.error(e)
                window.alert('Error updating course. Please try again.')
            })
    }

    const fileChangeHandler = (event) => {
        let file = event.target.files[0]
        const renamedFile = new File([file], currentCourse.course_id + '.csv', {
            type: file.type,
        })
        csvFormData.set('csv_file', renamedFile)
    }

    /**
     * Add student to the course
     */
    const addStudent = async () => {
        const nameArray = Name.split(' ')
        const first = nameArray[0]
        const last = nameArray[1]
        if (Name === '' || Email === '') {
            alert('Please enter both name and email for the student!')
            return
        }
        if (nameArray.length < 2) {
            alert('Please enter first and last name!')
            return
        }
        // if (!Email.includes('oswego.edu')) {
        //   alert('Please enter a valid Oswego email!');
        //   return;
        // }

        const firstLastEmail = first + '-' + last + '-' + Email
        const addStudentUrl = `${url}/${courseId}/students/${firstLastEmail}/add`
        await axios
            .post(addStudentUrl)
            .then((res) => {
                alert('Successfully added student.')
                dispatch(getCourseDetailsAsync(courseId))
            })
            .catch((e) => {
                console.error(e)
                alert('Error adding student.')
            })
        setFalse()
        setFormData({ ...formData, Name: '', Email: '' })
        dispatch(getCurrentCourseStudentsAsync(courseId))
    }

    /**
     * Delete the student from the course
     */
    const deleteStudent = async (Email) => {
        const deleteStudentUrl = `${url}/${courseId}/students/${Email.student_id}/delete`
        await axios
            .delete(deleteStudentUrl)
            .then((res) => {
                alert('Successfully deleted student.')
                dispatch(getCurrentCourseStudentsAsync(courseId))
            })
            .catch((e) => {
                console.error(e)
                alert('Error deleting student.')
            })
        dispatch(getCourseDetailsAsync(courseId))
    }

    /**
     * Retrieves the roster for the given course from the database.
     */
    const retrieveRoster = async () => {
        const reqUrl = '${url}/course/${courseId}/students'
        const config = {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("jwt_token")}`
            }
        };
        try {
            const res = await axios.get(reqUrl, config);
            const resRoster = res.data;
            setRoster(resRoster);
        } catch (err) {
            console.log(err);
        }
    };
    const generateActions = () => {
        return (
            <></>
        )
    };

    /**
     * Generates a single row in the roster table.
     *
     * @param datum a student object
     * @param idx the index of the student in the roster array
     */
    const generateRowContent = (datum, idx) => {
        const color = idx % 2 === 0 ? classes.white : classes.gray;
        return (
            <tr className={classes.row}>
                <td className={`${color} ${classes.row}`}> {datum.name} </td>
                <td className={`${color} ${classes.row}`}> {datum.student_id} </td>
                <td className={`${color} ${classes.row}`}> Computer Science </td>
                <td className={`${color} ${classes.row}`}> {datum.team} </td>
                <td className={`${color} ${classes.row}`}> {generateActions(datum)} </td>
            </tr>
        );
    };

    /**
     * Generates content for the entire table.
     */
    const generateTableContent = () => {
        const tableContent = [];
        let i = 0;
        getRoster.forEach(student => {
            tableContent.push(generateRowContent(student, i));
            ++i;
        });
        return tableContent;
    };

    /* Any code in this block will only be run on refresh. */
    useEffect(() => {
        /* comment this back in once you have the backend up
        and running and are using real data rather than the
        dummy data currently being used for the roster state */
        // retrieveRoster();
    }, [])



    return (
        <>
            {getRoster.length !== 0 &&
                <div className={classes.container}>
                    <table className={classes.table} cellSpacing={0}>
                        <tr>
                            <td className={classes.tableHeader}> Name </td>
                            <td className={classes.tableHeader}> Laker Net ID </td>
                            <td className={classes.tableHeader}> Major </td>
                            <td className={classes.tableHeader}> Team </td>
                            <td className={classes.tableHeader}> Actions </td>
                        </tr>
                        {generateTableContent()}
                    </table>
                </div>
            }
        </>
    );
};

export default Roster;
