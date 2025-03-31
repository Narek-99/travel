import { FILTER_QUERY, USER, } from "../action/ActionTypes";

const initialState = {
    filterQuery: null,
    user: null,
}

const appReducer = (state = initialState, action) => {
    switch (action.type) {
        case USER:
            let newState = Object.assign({}, state);
            newState.user = action.payload;
            return newState;
        case FILTER_QUERY: {
            let newState = Object.assign({}, state)
            newState.filterQuery = { ...action.payload }
            return newState
        }
        default:
            return state;
    }
};

export default appReducer;
