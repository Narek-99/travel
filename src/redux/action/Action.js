import {  FILTER_QUERY, USER } from "./ActionTypes";


export const setFilterQuery = (data) => ({
        type: FILTER_QUERY,
        payload: data,
    })

    export const setUser = (data) => ({
        type: USER,
        payload: data,
});