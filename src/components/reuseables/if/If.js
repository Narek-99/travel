import { memo } from 'react'

const If = ({ condition, children, elseComp }) => {
    if (condition) {
        return children
    }
    else {
        return elseComp ? elseComp : null
    }
}

export default memo(If)
