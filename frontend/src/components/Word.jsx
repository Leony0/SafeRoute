import List from "./List"
import Form from "./Form"

import { useEffect, useState } from 'react'
import axios from "axios";

const Word = () => {
    const [words, setWords] = useState([]);
    const [newWord, setNewWord] = useState({
        title: "",
        info: "",
      });
    

    useEffect(() => {
      const getWord = async () => {
        const res =await axios.get("http://localhost:8000/crime/all")
        console.log(res.data)
      
        // res.dataが配列であることを確認
        if (Array.isArray(res.data.locations)) {
          setWords(res.data.locations);
        } else {
          console.error("レスポンスが配列ではありません:", res.data);
        }
      };
      getWord();
    },[])

    
    const deleteWord = async (id) => {
      await axios.delete(`http://localhost:8000/crime/${id}`)
      setWords((prevWords) => prevWords.filter((word) => word.id !== id));
    
    };

    const createWord = async () => {
        if (!newWord.title || !newWord.info) {
          alert("タイトルと情報を入力してください");
          return;
        }
        const response = await axios.post("http://localhost:8000/crime/", newWord);
        setWords((prevWords) => [...prevWords, response.data]); 
        // POST後に最新のデータをGETで取得
        const res = await axios.get("http://localhost:8000/crime/all");
        setNewWord({ title: "", info: ""}); 
    };

    const handleSubmit = (e) => {
        e.preventDefault(); 
        createWord();
    };


  
    return (
      <>
        <Form newWord={newWord} setNewWord={setNewWord} handleSubmit={handleSubmit}/>
      </>
    )
}

export default Word;