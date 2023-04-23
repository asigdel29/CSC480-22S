import React, { useState, useEffect } from "react";
import axios from "axios";
import classes from "./RosterModule.css";
import {getCourseDetailsAsync, getCurrentCourseStudentsAsync} from "../../redux/features/courseSlice";

const Roster = (props) => {
    const dispatch = useDispatch()
    const { currentCourse } = useSelector((state) => state.courses)
    const courseParse = window.location.pathname;
    const courseId = courseParse.split("/")[2];
    const url = `${process.env.REACT_APP_URL}/manage/professor/courses`
    const { currentCourseStudents } = useSelector((state) => state.courses)
    let navigate = useNavigate()
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

    /**
     * Retrieves all the students in the course and searches through the JSON and returns the student
     */
    const searchStudent = {
        searchStudents: async function(courseID, searchText) {
            const SearchStudentUrl = `${url}/course/${courseId}/students`
            const response = await fetch(SearchStudentUrl);
            const data = await response.json();
            const filteredData = data.filter(student => student.name.includes(searchText));
            return filteredData.map(student => student.name);
        }
    };

    /**
     * This function first creates an empty object selectedStudents to keep track of which students are selected.
     * It then creates a dropdown menu with options for each student with checkbox element with document.createElement().
     * The checkbox has its value to the student name, When the checkbox is clicked, the student name is added to the
     * selectedStudents object .When the checkbox is unchecked, the student is removed
     * from the selectedStudents object with delete selectedStudents[name].And returns the filtered Students
     */

    const filterStudent = {
        filterStudents: async function(courseID) {
            const FilterStudentUrl = `${url}/course/${courseId}/students`
            const response = await fetch(FilterStudentUrl);
            const data = await response.json();
            const studentNames = data.map(student => student.name);
            const selectedStudents = {};
            const dropdown = document.createElement("select");
            studentNames.forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.text = name;
                dropdown.add(option);
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = name;
                checkbox.addEventListener("change", event => {
                    if (event.target.checked) {
                        selectedStudents[name] = true;
                    } else {
                        delete selectedStudents[name];
                    }
                });
                const label = document.createElement("label");
                label.textContent = name;
                label.insertBefore(checkbox, label.firstChild);
                document.body.appendChild(label);
            });
            const button = document.createElement("button");
            button.textContent = "Filter";
            const filteredStudents = new Promise(resolve => {
                button.addEventListener("click", () => {
                    const filteredData = data.filter(student => selectedStudents[student.name]);
                    resolve(filteredData);
                });
            });
            document.body.appendChild(dropdown);
            document.body.appendChild(button);
            return filteredStudents;
        }
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
