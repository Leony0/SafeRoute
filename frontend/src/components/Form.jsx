import { useEffect, useState } from 'react'
import '../styles/Form.css';

const Form = ({newWord, setNewWord, handleSubmit}) => {

    return (
        <div className="crime-form-container">
            <h2 className="crime-form-title">犯罪情報を追加</h2>
            <form className="crime-form" onSubmit={handleSubmit}>
                <input
                type="text"
                placeholder="場所"
                value={newWord.title}
                onChange={(e) => setNewWord({ ...newWord, title: e.target.value })}
                />
                <input
                type="text"
                placeholder="詳細"
                value={newWord.info}
                onChange={(e) => setNewWord({ ...newWord, info: e.target.value })}
                />
                <button type="submit">登録</button>
            </form>
        </div>
    )
}

export default Form;