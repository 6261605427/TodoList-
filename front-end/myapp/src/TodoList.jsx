import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setTasks, addTask, removeTask } from "./store/slice";
import axios from "axios";
import socket from "./socket"; 
import 'bootstrap/dist/css/bootstrap.min.css'; 
import { Modal, Button, Table } from "react-bootstrap"; 

const API_URL = "http://localhost:5000/tasks"; 

const TodoList = () => {
    const dispatch = useDispatch();
    const tasks = useSelector((state) => state.tasks.tasks);
    const [newTask, setNewTask] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [editTask, setEditTask] = useState(null);
    const [editText, setEditText] = useState("");

    useEffect(() => {
        setLoading(true);
        axios
            .get(API_URL)
            .then((response) => {
                dispatch(setTasks(response.data));
                setLoading(false);
            })
            .catch((err) => {
                setError("Failed to load tasks");
                setLoading(false);
            });

        socket.on("taskAdded", (task) => dispatch(addTask(task)));
        socket.on("taskDeleted", (taskId) => dispatch(removeTask(taskId)));

        return () => {
            socket.off("taskAdded");
            socket.off("taskDeleted");
        };
    }, [dispatch]);

    const handleAddTask = async () => {
        if (!newTask.trim()) return;
        const task = { text: newTask, completed: false };

        try {
            const response = await axios.post(API_URL, task);
            socket.emit("addTask", response.data); 
            setNewTask("");
        } catch (err) {
            setError("Failed to add task");
        }
    };

    const handleDeleteTask = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`);
            dispatch(removeTask(id)); 
            socket.emit("deleteTask", id); 
        } catch (err) {
            setError("Failed to delete task");
        }
    };
    

    const handleEditTask = (task) => {
        setEditTask(task);
        setEditText(task.text);
    };

    const handleUpdateTask = async () => {
        if (!editText.trim()) return;
        try {
            const response = await axios.put(`${API_URL}/${editTask._id}`, { text: editText });
            socket.emit("updateTask", response.data); // Notify WebSocket
            setEditTask(null);
        } catch (err) {
            setError("Failed to update task");
        }
    };

    return (
        <div className="container mt-5">
            <h2 className="text-center">Real-time Todo List</h2>

            {error && <p className="text-danger text-center">{error}</p>}
            {loading && <p className="text-center">Loading tasks...</p>}

            <div className="d-flex justify-content-center my-3">
                <input
                    type="text"
                    className="form-control w-50 me-2"
                    placeholder="Enter a new task..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleAddTask}>
                    Add Task
                </button>
            </div>

            <Table striped bordered hover className="mt-3">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Task</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task, index) => (
                        <tr key={task._id}>
                            <td>{index + 1}</td>
                            <td>{task.text}</td>
                            <td>
                                <button className="btn btn-warning me-2" onClick={() => handleEditTask(task)}>
                                    Edit
                                </button>
                                <button className="btn btn-danger" onClick={() => handleDeleteTask(task._id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Edit Task Modal */}
            <Modal show={!!editTask} onHide={() => setEditTask(null)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Task</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <input
                        type="text"
                        className="form-control"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setEditTask(null)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleUpdateTask}>
                        Update
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default TodoList;
