const List = ({words, deleteWord}) => {
    const  clear = (id) =>{
        deleteWord(id)
    }
    return (
      <div>
        <h2>単語一覧</h2>
        {words.map(word => {
          return(
            <div key={word.id}>
                
                <h3> {word.word}</h3>
                <p>意味：{word.meaning}</p>
                <p>例文：{word.example_sentence}</p>
                <button onClick={() => clear(word.id)}>削除</button>
          </div>
          )
        })}
      </div>
    )
}

export default List;